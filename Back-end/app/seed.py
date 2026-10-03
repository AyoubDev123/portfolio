"""Chargement du contenu initial (app/data/content.json) en base.

python -m app.seed            # insère si la base est vide
python -m app.seed --reset    # vide les tables de contenu puis réinsère
"""

import json
import sys
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import models
from .config import get_settings
from .database import make_engine, make_session_factory

CONTENT_FILE = Path(__file__).parent / "data" / "content.json"

CONTENT_TABLES = (
    models.Project,
    models.Experience,
    models.SkillGroup,
    models.Education,
    models.Certification,
    models.Interest,
    models.Profile,
)


def load_content(path: Path = CONTENT_FILE) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def is_seeded(db: Session) -> bool:
    return db.scalars(select(models.Profile.id).limit(1)).first() is not None


def seed(db: Session, content: dict | None = None, *, reset: bool = False) -> bool:
    """Insère le contenu. Retourne False si la base contenait déjà des données (sans reset)."""
    content = content or load_content()
    if reset:
        for table in CONTENT_TABLES:
            db.execute(delete(table))
        db.commit()
    elif is_seeded(db):
        return False

    db.add(models.Profile(**content["profile"]))

    experience_ids: dict[str, int] = {}
    for item in content["experiences"]:
        exp = models.Experience(**{**item, "start_date": _d(item["start_date"]), "end_date": _d(item["end_date"])})
        db.add(exp)
        db.flush()
        experience_ids[exp.slug] = exp.id

    for item in content["projects"]:
        data = dict(item)
        exp_slug = data.pop("experience", None)
        db.add(models.Project(**data, experience_id=experience_ids[exp_slug] if exp_slug else None))

    for key, model in (
        ("skill_groups", models.SkillGroup),
        ("education", models.Education),
        ("certifications", models.Certification),
        ("interests", models.Interest),
    ):
        db.add_all(model(**item) for item in content[key])

    db.commit()
    return True


def _d(value: str | None):
    from datetime import date

    return date.fromisoformat(value) if value else None


def main() -> None:
    settings = get_settings()
    engine = make_engine(settings.database_url)
    models.Base.metadata.create_all(engine)
    with make_session_factory(engine)() as db:
        done = seed(db, reset="--reset" in sys.argv)
    print("Contenu chargé." if done else "Base déjà initialisée (utiliser --reset pour recharger).")


if __name__ == "__main__":
    main()
