"""CRUD protégé (JWT) pour gérer le contenu depuis l'espace admin.

Une fabrique génère le CRUD de chaque entité : un seul endroit à tester et à durcir,
là où le portfolio v1 dupliquait un fichier PHP par table.
"""

from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..deps import get_db, require_admin

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


def add_crud(
    path: str,
    model: type,
    schema_in: type[BaseModel],
    schema_out: type[BaseModel],
    to_out: Callable[[Any], BaseModel] | None = None,
    order_by: tuple = (),
) -> None:
    out = to_out or schema_out.model_validate

    def get_or_404(db: Session, item_id: int):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(404, "Introuvable")
        return obj

    @router.get(f"/{path}", response_model=list[schema_out], name=f"list_{path}")
    def list_items(db: Session = Depends(get_db)):
        order = order_by or (model.id,)
        return [out(o) for o in db.scalars(select(model).order_by(*order)).all()]

    @router.post(f"/{path}", response_model=schema_out, status_code=201, name=f"create_{path}")
    def create_item(body: schema_in, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = model(**body.model_dump())
        db.add(obj)
        _commit(db)
        db.refresh(obj)
        return out(obj)

    @router.get(f"/{path}/{{item_id}}", response_model=schema_out, name=f"get_{path}")
    def read_item(item_id: int, db: Session = Depends(get_db)):
        return out(get_or_404(db, item_id))

    @router.put(f"/{path}/{{item_id}}", response_model=schema_out, name=f"update_{path}")
    def update_item(item_id: int, body: schema_in, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = get_or_404(db, item_id)
        _apply(obj, body.model_dump())
        _commit(db)
        db.refresh(obj)
        return out(obj)

    @router.delete(f"/{path}/{{item_id}}", status_code=204, name=f"delete_{path}")
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        db.delete(get_or_404(db, item_id))
        _commit(db)
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
def get_profile(db: Session = Depends(get_db)):
    profile = db.scalars(select(models.Profile).limit(1)).first()
    if profile is None:
        raise HTTPException(404, "Profil non initialisé")
    return profile


@router.put("/profile", response_model=schemas.ProfileRead)
def put_profile(body: schemas.ProfileBase, db: Session = Depends(get_db)):
    profile = db.scalars(select(models.Profile).limit(1)).first()
    data = body.model_dump()
    if profile is None:
        profile = models.Profile(**data)
        db.add(profile)
    else:
        _apply(profile, data)
    _commit(db)
    db.refresh(profile)
    return profile


@router.get("/messages", response_model=list[schemas.ContactMessageRead])
def list_messages(db: Session = Depends(get_db)):
    return db.scalars(select(models.ContactMessage).order_by(models.ContactMessage.id.desc())).all()


@router.delete("/messages/{message_id}", status_code=204)
def delete_message(message_id: int, db: Session = Depends(get_db)):
    msg = db.get(models.ContactMessage, message_id)
    if msg is None:
        raise HTTPException(404, "Introuvable")
    db.delete(msg)
    db.commit()
    return Response(status_code=204)
