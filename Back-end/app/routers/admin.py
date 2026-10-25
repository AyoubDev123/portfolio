"""CRUD protégé (cookie HttpOnly) pour gérer le contenu depuis l'espace admin.

Après chaque mutation (create / update / delete), une tâche de fond régénère le
snapshot statique via `export_from_session`, ce qui garde le fallback JSON synchronisé
avec la DB sans allonger le temps de réponse de la requête.
"""

from collections.abc import Callable
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, Response, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..config import Settings
from ..cv_import import MAX_PDF_BYTES, ImportError_, apply_to_account, extract, warnings
from ..deps import get_db, get_settings, require_admin
from ..export_static import export_from_session

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _apply(obj: Any, data: dict[str, Any]) -> None:
    for key, value in data.items():
        setattr(obj, key, value)


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Conflit : valeur déjà utilisée ou référence invalide") from exc


def _schedule_snapshot(bg: BackgroundTasks, request: Request, settings: Settings, user_id: int, slug: str) -> None:
    """Planifie la régénération du snapshot statique en arrière-plan si configuré."""
    if not settings.static_snapshot_path or slug != settings.static_snapshot_slug:
        return
    session_factory = request.app.state.session_factory
    out = Path(settings.static_snapshot_path)

    def _export() -> None:
        with session_factory() as db:
            export_from_session(db, out, user_id)

    bg.add_task(_export)


def add_crud(
    path: str,
    model: type,
    schema_in: type[BaseModel],
    schema_out: type[BaseModel],
    to_out: Callable[[Any], BaseModel] | None = None,
    order_by: tuple = (),
) -> None:
    out = to_out or schema_out.model_validate

    def get_or_404(db: Session, item_id: int, user: models.User):
        obj = db.get(model, item_id)
        # Un objet qui appartient à quelqu'un d'autre doit être indistinguable
        # d'un objet inexistant : répondre 403 révélerait qu'il existe.
        if obj is None or obj.user_id != user.id:
            raise HTTPException(404, "Introuvable")
        return obj

    @router.get(f"/{path}", response_model=list[schema_out], name=f"list_{path}")
    def list_items(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
        order = order_by or (model.id,)
        rows = db.scalars(select(model).where(model.user_id == user.id).order_by(*order)).all()
        return [out(o) for o in rows]

    @router.post(f"/{path}", response_model=schema_out, status_code=201, name=f"create_{path}")
    def create_item(
        body: schema_in,
        request: Request,
        bg: BackgroundTasks,
        db: Session = Depends(get_db),
        settings: Settings = Depends(get_settings),
        user: models.User = Depends(require_admin),
    ):  # type: ignore[valid-type]
        obj = model(**body.model_dump(), user_id=user.id)
        db.add(obj)
        _commit(db)
        db.refresh(obj)
        _schedule_snapshot(bg, request, settings, user.id, user.slug)
        return out(obj)

    @router.get(f"/{path}/{{item_id}}", response_model=schema_out, name=f"get_{path}")
    def read_item(
        item_id: int,
        db: Session = Depends(get_db),
        user: models.User = Depends(require_admin),
    ):
        return out(get_or_404(db, item_id, user))

    @router.put(f"/{path}/{{item_id}}", response_model=schema_out, name=f"update_{path}")
    def update_item(
        item_id: int,
        body: schema_in,
        request: Request,
        bg: BackgroundTasks,
        db: Session = Depends(get_db),
        settings: Settings = Depends(get_settings),
        user: models.User = Depends(require_admin),
    ):  # type: ignore[valid-type]
        obj = get_or_404(db, item_id, user)
        _apply(obj, body.model_dump())
        _commit(db)
        db.refresh(obj)
        _schedule_snapshot(bg, request, settings, user.id, user.slug)
        return out(obj)

    @router.delete(f"/{path}/{{item_id}}", status_code=204, name=f"delete_{path}")
    def delete_item(
        item_id: int,
        request: Request,
        bg: BackgroundTasks,
        db: Session = Depends(get_db),
        settings: Settings = Depends(get_settings),
        user: models.User = Depends(require_admin),
    ):
        db.delete(get_or_404(db, item_id, user))
        _commit(db)
        _schedule_snapshot(bg, request, settings, user.id, user.slug)
        return Response(status_code=204)


add_crud(
    "experiences",
    models.Experience,
    schemas.ExperienceBase,
    schemas.ExperienceRead,
    to_out=services._experience_out,
    order_by=(models.Experience.position, models.Experience.id),
)
add_crud(
    "projects",
    models.Project,
    schemas.ProjectBase,
    schemas.ProjectRead,
    to_out=services._project_out,
    order_by=(models.Project.position, models.Project.id),
)
add_crud("skill-groups", models.SkillGroup, schemas.SkillGroupBase, schemas.SkillGroupRead)
add_crud("education", models.Education, schemas.EducationBase, schemas.EducationRead)
add_crud("certifications", models.Certification, schemas.CertificationBase, schemas.CertificationRead)
add_crud("interests", models.Interest, schemas.InterestBase, schemas.InterestRead)


@router.get("/profile", response_model=schemas.ProfileRead)
def get_profile(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    profile = db.scalars(select(models.Profile).where(models.Profile.user_id == user.id)).first()
    if profile is None:
        raise HTTPException(404, "Profil non initialisé")
    return profile


@router.put("/profile", response_model=schemas.ProfileRead)
def put_profile(
    body: schemas.ProfileBase,
    request: Request,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    user: models.User = Depends(require_admin),
):
    profile = db.scalars(select(models.Profile).where(models.Profile.user_id == user.id)).first()
    data = body.model_dump()
    if profile is None:
        profile = models.Profile(**data, user_id=user.id)
        db.add(profile)
    else:
        _apply(profile, data)
    _commit(db)
    db.refresh(profile)
    _schedule_snapshot(bg, request, settings, user.id, user.slug)
    return profile


@router.get("/messages", response_model=list[schemas.ContactMessageRead])
def list_messages(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    return db.scalars(
        select(models.ContactMessage)
        .where(models.ContactMessage.user_id == user.id)
        .order_by(models.ContactMessage.id.desc())
    ).all()


@router.patch("/messages/{message_id}/read", response_model=schemas.ContactMessageRead)
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    msg = db.get(models.ContactMessage, message_id)
    if msg is None or msg.user_id != user.id:
        raise HTTPException(404, "Introuvable")
    msg.is_read = True
    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/messages/{message_id}", status_code=204)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    msg = db.get(models.ContactMessage, message_id)
    if msg is None or msg.user_id != user.id:
        raise HTTPException(404, "Introuvable")
    db.delete(msg)
    db.commit()
    return Response(status_code=204)


@router.post("/import-cv", response_model=schemas.CvImportOut)
async def import_cv(
    request: Request,
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    user: models.User = Depends(require_admin),
):
    """Remplit le portfolio du compte à partir d'un CV PDF."""
    if not settings.gemini_api_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "L'analyse de CV n'est pas configurée sur ce serveur")
    if file.content_type != "application/pdf":
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Seuls les fichiers PDF sont acceptés")

    pdf = await file.read()
    if not pdf:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Le fichier est vide")
    if len(pdf) > MAX_PDF_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Le PDF dépasse 10 Mo")

    try:
        content = extract(pdf, settings.gemini_api_key)
    except ImportError_ as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    counts = apply_to_account(db, user.id, content)
    _schedule_snapshot(bg, request, settings, user.id, user.slug)
    return schemas.CvImportOut(counts=counts, warnings=warnings(content))
