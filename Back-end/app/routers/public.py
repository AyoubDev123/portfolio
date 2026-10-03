"""Endpoints publics en lecture seule."""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..deps import get_db

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(select(1))
    return {"status": "ok"}


@router.get("/portfolio", response_model=schemas.PortfolioRead)
def get_portfolio(response: Response, db: Session = Depends(get_db)):
    data = services.build_portfolio(db)
    if data is None:
        raise HTTPException(503, "Contenu non initialisé")
    response.headers["Cache-Control"] = "public, max-age=60"
    return data


@router.get("/projects/{slug}", response_model=schemas.ProjectRead)
def get_project(slug: str, db: Session = Depends(get_db)):
    project = db.scalars(select(models.Project).where(models.Project.slug == slug)).first()
    if project is None:
        raise HTTPException(404, "Projet introuvable")
    return services._project_out(project)
