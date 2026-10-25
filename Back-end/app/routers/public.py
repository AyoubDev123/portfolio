"""Endpoints publics en lecture seule : un portfolio par slug."""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..deps import get_db

router = APIRouter(prefix="/api", tags=["public"])


def _owner(db: Session, slug: str) -> models.User:
    """Le compte derrière /<slug>.

    Un brouillon reste invisible : tant que l'étudiant n'a pas publié, son
    contenu à moitié rempli ne doit pas être atteignable par une URL devinée.
    Même réponse que pour un slug inexistant, pour ne pas révéler qui a un compte.
    """
    user = db.scalars(select(models.User).where(models.User.slug == slug)).first()
    if user is None or not user.published:
        raise HTTPException(404, "Portfolio introuvable")
    return user


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(select(1))
    return {"status": "ok"}


@router.get("/p/{slug}", response_model=schemas.PortfolioRead)
def get_portfolio_by_slug(slug: str, response: Response, db: Session = Depends(get_db)):
    data = services.build_portfolio(db, _owner(db, slug).id)
    if data is None:
        raise HTTPException(404, "Portfolio introuvable")
    response.headers["Cache-Control"] = "public, max-age=60"
    return data


@router.get("/p/{slug}/projects/{project_slug}", response_model=schemas.ProjectRead)
def get_project(slug: str, project_slug: str, db: Session = Depends(get_db)):
    user = _owner(db, slug)
    project = db.scalars(
        select(models.Project).where(models.Project.user_id == user.id, models.Project.slug == project_slug)
    ).first()
    if project is None:
        raise HTTPException(404, "Projet introuvable")
    return services._project_out(project)
