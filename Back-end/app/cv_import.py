"""Import d'un CV : extraction, contrôle de cohérence, écriture en base.

Le modèle ne reçoit pas de texte extrait mais le PDF entier : la mise en page
porte du sens dans un CV, surtout sur deux colonnes. La sortie est contrainte
par les schémas de l'API, donc elle est valide ou l'appel échoue.
"""

from __future__ import annotations

import time
from datetime import date

from google import genai
from google.genai import errors, types
from sqlalchemy import delete
from sqlalchemy.orm import Session

from . import models
from .import_cv import PROMPT, PortfolioImport

DEFAULT_MODEL = "gemini-3.5-flash"
MAX_PDF_BYTES = 10 * 1024 * 1024

# Le contenu remplacé par un import, dans l'ordre inverse des dépendances.
_REPLACED = (
    models.Project,
    models.Experience,
    models.SkillGroup,
    models.Education,
    models.Certification,
    models.Interest,
)


class ImportError_(Exception):
    """Échec côté modèle ou PDF illisible, avec un message montrable à l'utilisateur."""


# Surcharge côté modèle : transitoire, l'import ne doit pas échouer pour ça.
_TRANSIENT = {429, 500, 503}


def extract(pdf: bytes, api_key: str, model: str = DEFAULT_MODEL, attempts: int = 3) -> PortfolioImport:
    client = genai.Client(api_key=api_key)
    last: errors.APIError | None = None

    for attempt in range(attempts):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[types.Part.from_bytes(data=pdf, mime_type="application/pdf"), PROMPT],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=PortfolioImport,
                ),
            )
        except errors.APIError as exc:
            if exc.code not in _TRANSIENT or attempt == attempts - 1:
                raise ImportError_(f"Le service d'analyse a refusé l'appel ({exc.code}).") from exc
            last = exc
            time.sleep(2**attempt)
            continue

        if response.parsed is None:
            raise ImportError_("Le CV n'a pas pu être analysé. Vérifie que le PDF contient du texte.")
        return response.parsed

    raise ImportError_(f"Le service d'analyse est indisponible ({last.code if last else '?'}).")


def warnings(content: PortfolioImport) -> list[str]:
    """Ce qu'un humain doit regarder avant de publier.

    Un portfolio faux est pire qu'un portfolio incomplet : on signale plutôt que
    de corriger à l'aveugle, parce que seul l'étudiant sait ce qui est vrai.
    """
    out: list[str] = []
    today = date.today()
    exps = content.experiences

    if exps and not any(e.end_date is None or e.end_date >= today for e in exps):
        out.append(
            "Aucune expérience en cours n'a été trouvée. "
            "Si tu es en alternance ou en stage aujourd'hui, ton CV ne le mentionne pas."
        )

    for a in exps:
        for b in exps:
            if a is b or a.end_date is None or b.end_date is None:
                continue
            if a.start_date < b.start_date and a.end_date > b.start_date:
                out.append(
                    f"{a.company} ({a.start_date:%m/%Y} – {a.end_date:%m/%Y}) chevauche "
                    f"{b.company}, qui commence en {b.start_date:%m/%Y}. Vérifie les dates."
                )

    long_titles = [p.title for p in content.projects if len(p.title) > 60]
    if long_titles:
        out.append(
            f"{len(long_titles)} titre(s) de projet ressemblent à des descriptions. "
            "Un titre court se lit mieux sur une carte."
        )

    if not content.projects:
        out.append("Aucun projet n'a été trouvé. C'est souvent ce que les recruteurs regardent en premier.")

    return out


def apply_to_account(db: Session, user_id: int, content: PortfolioImport) -> dict[str, int]:
    """Remplace le contenu du compte. Le profil est fusionné, pas écrasé.

    Photo, CV, liens et adresse saisis à la main survivent à un réimport : le CV
    ne les contient pas, les écraser avec du vide serait une perte.
    """
    for model in _REPLACED:
        db.execute(delete(model).where(model.user_id == user_id))

    profile = db.query(models.Profile).filter_by(user_id=user_id).one_or_none()
    incoming = content.profile.model_dump()
    keep = {"photo", "cv_url", "linkedin", "github"}
    if profile is None:
        db.add(models.Profile(**incoming, user_id=user_id))
    else:
        for key, value in incoming.items():
            if key in keep and not value:
                continue
            setattr(profile, key, value)

    exp_ids: dict[str, int] = {}
    for item in content.experiences:
        exp = models.Experience(**item.model_dump(), user_id=user_id)
        db.add(exp)
        db.flush()
        exp_ids[exp.slug] = exp.id

    for item in content.projects:
        data = item.model_dump()
        linked = data.pop("experience", None)
        db.add(
            models.Project(
                **data,
                user_id=user_id,
                experience_id=exp_ids.get(linked) if linked else None,
            )
        )

    for items, model in (
        (content.skill_groups, models.SkillGroup),
        (content.education, models.Education),
        (content.certifications, models.Certification),
        (content.interests, models.Interest),
    ):
        db.add_all(model(**i.model_dump(), user_id=user_id) for i in items)

    db.commit()
    return {
        "experiences": len(content.experiences),
        "projects": len(content.projects),
        "education": len(content.education),
        "certifications": len(content.certifications),
        "skill_groups": len(content.skill_groups),
        "interests": len(content.interests),
    }
