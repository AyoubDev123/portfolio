"""Modèle de données.

Évolution du schéma MySQL du portfolio v1 (Profil, Formation, Experience, Projet,
Competence, Realisation, outils, Certifications, Passion + tables d'association) :
les tables de liaison many-to-many ont été remplacées par des colonnes JSON (liste
de technologies, de réalisations…) — ces listes n'ont pas besoin d'être jointes ni
filtrées côté SQL pour un portfolio, et l'API reste plus simple.
"""

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Profile(Base):
    __tablename__ = "profile"
    # Un profil par compte (remplace l'ancienne contrainte singleton mono-utilisateur).
    __table_args__ = (UniqueConstraint("user_id", name="uq_profile_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    headline: Mapped[str] = mapped_column(String(200))
    tagline: Mapped[str] = mapped_column(Text)
    about: Mapped[list] = mapped_column(JSON, default=list)  # paragraphes
    status_label: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(120), default="")
    linkedin: Mapped[str] = mapped_column(String(300), default="")
    github: Mapped[str] = mapped_column(String(300), default="")
    photo: Mapped[str] = mapped_column(String(300), default="")
    cv_url: Mapped[str] = mapped_column(String(300), default="")
    languages: Mapped[list] = mapped_column(JSON, default=list)  # [{name, level}]
    metrics: Mapped[list] = mapped_column(JSON, default=list)  # [{value, label}]
    # Traductions : {"fr": {"<champ>": <valeur>}}. Les colonnes portent l'anglais
    # (langue canonique) ; i18n ne contient que les champs réellement traduits.
    i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Experience(Base):
    __tablename__ = "experience"
    __table_args__ = (UniqueConstraint("user_id", "slug", name="uq_experience_user_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True)
    slug: Mapped[str] = mapped_column(String(80), index=True)
    company: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(160))
    contract: Mapped[str] = mapped_column(String(60))  # Alternance, Stage…
    location: Mapped[str] = mapped_column(String(120), default="")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # None = en cours
    summary: Mapped[str] = mapped_column(Text, default="")
    highlights: Mapped[list] = mapped_column(JSON, default=list)
    stack: Mapped[list] = mapped_column(JSON, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Traductions : {"fr": {"<champ>": <valeur>}}. Les colonnes portent l'anglais
    # (langue canonique) ; i18n ne contient que les champs réellement traduits.
    i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    projects: Mapped[list["Project"]] = relationship(back_populates="experience")


class Project(Base):
    __tablename__ = "project"
    __table_args__ = (UniqueConstraint("user_id", "slug", name="uq_project_user_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True)
    slug: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(160))
    subtitle: Mapped[str] = mapped_column(String(240), default="")
    period: Mapped[str] = mapped_column(String(80), default="")
    context: Mapped[str] = mapped_column(String(160), default="")  # cadre : BUT, stage…
    summary: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[list] = mapped_column(JSON, default=list)  # paragraphes
    highlights: Mapped[list] = mapped_column(JSON, default=list)
    stack: Mapped[list] = mapped_column(JSON, default=list)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    images: Mapped[list] = mapped_column(JSON, default=list)  # [{src, alt, caption}]
    links: Mapped[list] = mapped_column(JSON, default=list)  # [{label, url}]
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    experience_id: Mapped[int | None] = mapped_column(ForeignKey("experience.id", ondelete="SET NULL"), nullable=True)
    # Traductions : {"fr": {"<champ>": <valeur>}}. Les colonnes portent l'anglais
    # (langue canonique) ; i18n ne contient que les champs réellement traduits.
    i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    experience: Mapped[Experience | None] = relationship(back_populates="projects")


class SkillGroup(Base):
    __tablename__ = "skill_group"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    items: Mapped[list] = mapped_column(JSON, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Traductions : {"fr": {"<champ>": <valeur>}}. Les colonnes portent l'anglais
    # (langue canonique) ; i18n ne contient que les champs réellement traduits.
    i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Education(Base):
    __tablename__ = "education"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True)
    school: Mapped[str] = mapped_column(String(160))
    degree: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    start_year: Mapped[int] = mapped_column(Integer)
    end_year: Mapped[int] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Traductions : {"fr": {"<champ>": <valeur>}}. Les colonnes portent l'anglais
    # (langue canonique) ; i18n ne contient que les champs réellement traduits.
    i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Certification(Base):
    __tablename__ = "certification"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    issuer: Mapped[str] = mapped_column(String(160))
    date_label: Mapped[str] = mapped_column(String(60))
    kind: Mapped[str] = mapped_column(String(20), default="certification")  # | distinction
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Traductions : {"fr": {"<champ>": <valeur>}}. Les colonnes portent l'anglais
    # (langue canonique) ; i18n ne contient que les champs réellement traduits.
    i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Interest(Base):
    __tablename__ = "interest"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(300), default="")
    icon: Mapped[str] = mapped_column(String(40), default="sparkles")
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Traductions : {"fr": {"<champ>": <valeur>}}. Les colonnes portent l'anglais
    # (langue canonique) ; i18n ne contient que les champs réellement traduits.
    i18n: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ContactMessage(Base):
    __tablename__ = "contact_message"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    """Un compte = un portfolio, publié sur /<slug>."""

    __tablename__ = "user_account"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True, default="")
    password_hash: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False)  # accès à l'espace établissement
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TokenBlocklist(Base):
    """JTI des tokens révoqués (logout). Purgé périodiquement à chaque connexion."""

    __tablename__ = "token_blocklist"

    id: Mapped[int] = mapped_column(primary_key=True)
    jti: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
