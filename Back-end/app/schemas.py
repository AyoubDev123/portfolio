"""Schémas Pydantic (contrat de l'API)."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

SLUG = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Briques réutilisables -------------------------------------------------------
class LanguageLevel(BaseModel):
    name: str
    level: str


class Metric(BaseModel):
    value: str
    label: str


class ProjectImage(BaseModel):
    src: str
    alt: str
    caption: str = ""


class Link(BaseModel):
    label: str
    url: str


# --- Profil ------------------------------------------------------------------------
class ProfileBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    headline: str = Field(max_length=200)
    tagline: str
    about: list[str] = []
    status_label: str = ""
    email: EmailStr
    city: str = ""
    linkedin: str = ""
    github: str = ""
    photo: str = ""
    cv_url: str = ""
    languages: list[LanguageLevel] = []
    metrics: list[Metric] = []


class ProfileRead(ProfileBase, ORM):
    id: int


# --- Expériences -------------------------------------------------------------------
class ExperienceBase(BaseModel):
    slug: str = Field(pattern=SLUG, max_length=80)
    company: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=160)
    contract: str = Field(max_length=60)
    location: str = ""
    start_date: date
    end_date: date | None = None
    summary: str = ""
    highlights: list[str] = []
    stack: list[str] = []
    position: int = 0

    @field_validator("end_date")
    @classmethod
    def _end_after_start(cls, v, info):
        start = info.data.get("start_date")
        if v and start and v < start:
            raise ValueError("end_date doit être postérieure à start_date")
        return v


class ExperienceRead(ExperienceBase, ORM):
    id: int
    current: bool = False
    project_slugs: list[str] = []


# --- Projets -----------------------------------------------------------------------
class ProjectBase(BaseModel):
    slug: str = Field(pattern=SLUG, max_length=80)
    title: str = Field(min_length=1, max_length=160)
    subtitle: str = ""
    period: str = ""
    context: str = ""
    summary: str = ""
    description: list[str] = []
    highlights: list[str] = []
    stack: list[str] = []
    tags: list[str] = []
    images: list[ProjectImage] = []
    links: list[Link] = []
    featured: bool = False
    position: int = 0
    experience_id: int | None = None


class ProjectRead(ProjectBase, ORM):
    id: int
    experience_slug: str | None = None


# --- Autres entités ------------------------------------------------------------------
class SkillGroupBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    items: list[str] = []
    position: int = 0


class SkillGroupRead(SkillGroupBase, ORM):
    id: int


class EducationBase(BaseModel):
    school: str = Field(min_length=1, max_length=160)
    degree: str = Field(min_length=1, max_length=200)
    description: str = ""
    start_year: int = Field(ge=1990, le=2100)
    end_year: int = Field(ge=1990, le=2100)
    position: int = 0


class EducationRead(EducationBase, ORM):
    id: int


class CertificationBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    issuer: str = Field(max_length=160)
    date_label: str = Field(max_length=60)
    kind: Literal["certification", "distinction"] = "certification"
    position: int = 0


class CertificationRead(CertificationBase, ORM):
    id: int


class InterestBase(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=300)
    icon: str = "sparkles"
    position: int = 0


class InterestRead(InterestBase, ORM):
    id: int


# --- Agrégat public --------------------------------------------------------------------
class PortfolioRead(BaseModel):
    profile: ProfileRead
    experiences: list[ExperienceRead]
    projects: list[ProjectRead]
    skill_groups: list[SkillGroupRead]
    education: list[EducationRead]
    certifications: list[CertificationRead]
    interests: list[InterestRead]


# --- Contact -------------------------------------------------------------------------
class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=10, max_length=5000)
    website: str = ""  # honeypot : doit rester vide (champ caché côté front)

    @field_validator("name", "subject", "message")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("name", "subject")
    @classmethod
    def _no_header_injection(cls, v: str) -> str:
        if "\r" in v or "\n" in v:
            raise ValueError("retours à la ligne interdits")
        return v


class ContactOut(BaseModel):
    ok: bool = True


class ContactMessageRead(ORM):
    id: int
    name: str
    email: str
    subject: str
    message: str
    created_at: datetime


# --- Auth ------------------------------------------------------------------------------
class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MeOut(BaseModel):
    username: str
