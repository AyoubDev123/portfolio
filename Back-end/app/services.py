"""Assemblage des données publiques."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas


def _experience_out(e: models.Experience) -> schemas.ExperienceRead:
    out = schemas.ExperienceRead.model_validate(e)
    out.current = e.end_date is None or e.end_date >= date.today()
    out.project_slugs = [p.slug for p in sorted(e.projects, key=lambda p: (p.position, p.id))]
    return out


def _project_out(p: models.Project) -> schemas.ProjectRead:
    out = schemas.ProjectRead.model_validate(p)
    out.experience_slug = p.experience.slug if p.experience else None
    return out


def build_portfolio(db: Session) -> schemas.PortfolioRead | None:
    profile = db.scalars(select(models.Profile).limit(1)).first()
    if profile is None:
        return None

    experiences = db.scalars(
        select(models.Experience)
        .options(selectinload(models.Experience.projects))
        .order_by(models.Experience.position, models.Experience.start_date.desc())
    ).all()
    projects = db.scalars(
        select(models.Project)
        .options(selectinload(models.Project.experience))
        .order_by(models.Project.position, models.Project.id)
    ).all()

    def ordered(model):
        return db.scalars(select(model).order_by(model.position, model.id)).all()

    return schemas.PortfolioRead(
        profile=schemas.ProfileRead.model_validate(profile),
        experiences=[_experience_out(e) for e in experiences],
        projects=[_project_out(p) for p in projects],
        skill_groups=[schemas.SkillGroupRead.model_validate(x) for x in ordered(models.SkillGroup)],
        education=[schemas.EducationRead.model_validate(x) for x in ordered(models.Education)],
        certifications=[schemas.CertificationRead.model_validate(x) for x in ordered(models.Certification)],
        interests=[schemas.InterestRead.model_validate(x) for x in ordered(models.Interest)],
    )
