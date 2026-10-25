"""POC : transforme un CV PDF en contenu de portfolio (format app/data/content.json).

    export GEMINI_API_KEY=...
    python -m app.import_cv chemin/vers/cv.pdf [-o sortie.json] [--model ...]

Le PDF est envoyé tel quel au modèle (pas d'extraction de texte en amont) : la mise
en page porte du sens dans un CV, surtout sur deux colonnes. La sortie est contrainte
par les schémas Pydantic de l'API, donc elle est soit valide, soit en erreur — jamais
du JSON approximatif à rattraper.
"""

import argparse
import json
import os
import sys
from pathlib import Path

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field, create_model

from .config import get_settings
from .schemas import (
    SLUG,
    CertificationBase,
    EducationBase,
    ExperienceBase,
    InterestBase,
    ProfileBase,
    SkillGroupBase,
)

DEFAULT_MODEL = "gemini-3.1-pro-preview"
DEFAULT_OUT = Path(__file__).parent / "data" / "content.generated.json"


def _importable(model: type[BaseModel], name: str) -> type[BaseModel]:
    """Reprend un schéma de l'API sans son champ i18n.

    Un CV ne contient pas de traductions, et surtout `dict[str, dict]` produit
    `additionalProperties`, que l'API Gemini refuse dans un response_schema.
    """
    fields = {k: (f.annotation, f) for k, f in model.model_fields.items() if k != "i18n"}
    return create_model(name, **fields)


class ProjectImport(BaseModel):
    """ProjectBase, mais le projet pointe vers une expérience par slug (comme content.json).

    `images` et `links` sont absents : un CV ne contient ni captures d'écran ni URLs de démo.
    """

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
    featured: bool = False
    position: int = 0
    experience: str | None = None


class PortfolioImport(BaseModel):
    profile: _importable(ProfileBase, "ProfileImport")
    experiences: list[_importable(ExperienceBase, "ExperienceImport")] = []
    projects: list[ProjectImport] = []
    skill_groups: list[_importable(SkillGroupBase, "SkillGroupImport")] = []
    education: list[_importable(EducationBase, "EducationImport")] = []
    certifications: list[_importable(CertificationBase, "CertificationImport")] = []
    interests: list[_importable(InterestBase, "InterestImport")] = []


PROMPT = """Voici le CV d'un étudiant. Transforme-le en contenu structuré pour son portfolio web.

Règles :
- N'invente rien. Si une information est absente du CV, laisse le champ vide. Un portfolio
  qui annonce une expérience inexistante est pire qu'un portfolio incomplet.
- Écris dans la même langue que le CV.
- Les slugs sont en minuscules avec des tirets, dérivés du nom (ex. "safran", "credit-scoring").
- `position` suit l'ordre d'apparition dans le CV, en commençant à 0.
- `photo` et `cv_url` restent vides : ces fichiers ne sont pas dans le CV.
- Expériences : `contract` vaut Alternance, Stage, CDI, CDD, Freelance… `end_date` est
  null si le poste est en cours. `highlights` reprend les missions, une par ligne.
- Projets : `experience` contient le slug de l'expérience pendant laquelle le projet a été
  réalisé, ou null pour un projet académique ou personnel. `tags` sont des thèmes larges
  (ex. "Machine Learning", "Data Engineering"), `stack` les technologies concrètes.
- Certifications : `kind` vaut "distinction" pour un prix, une mention ou un classement,
  "certification" pour un diplôme ou une certification délivrée par un organisme.
- `tagline` est une phrase d'accroche écrite à partir du profil, `about` quelques
  paragraphes de présentation. C'est la seule part de rédaction autorisée : elle doit
  rester fidèle au contenu du CV."""


def build(pdf: Path, client: genai.Client, model: str) -> PortfolioImport:
    try:
        response = client.models.generate_content(
            model=model,
            contents=[
                types.Part.from_bytes(data=pdf.read_bytes(), mime_type="application/pdf"),
                PROMPT,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PortfolioImport,
            ),
        )
    except errors.APIError as exc:
        # Les modèles Gemini sont retirés régulièrement : l'API indique le remplaçant,
        # autant l'afficher plutôt qu'une trace de 40 lignes.
        sys.exit(f"Appel refusé par l'API ({exc.code}) : {exc.message}\nAutre modèle : --model <nom>")

    u = response.usage_metadata
    print(f"{u.prompt_token_count} tokens en entrée, {u.candidates_token_count} en sortie", file=sys.stderr)

    if response.parsed is None:
        sys.exit(f"Réponse inexploitable du modèle :\n{(response.text or '')[:500]}")
    return response.parsed


def main() -> None:
    parser = argparse.ArgumentParser(description="CV PDF -> contenu de portfolio")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("-o", "--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"défaut : {DEFAULT_MODEL}")
    args = parser.parse_args()

    if not args.pdf.is_file():
        sys.exit(f"Fichier introuvable : {args.pdf}")

    # La clé vient de l'environnement ou de Back-end/.env, comme les autres secrets.
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or get_settings().gemini_api_key
    if not key:
        sys.exit("Aucune clé : renseigne GEMINI_API_KEY dans l'environnement ou dans Back-end/.env.")

    content = build(args.pdf, genai.Client(api_key=key), args.model)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(content.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    p = content.profile
    print(f"\nÉcrit : {args.out}")
    print(f"  {p.first_name} {p.last_name} — {p.headline}")
    for label, items in (
        ("expériences", content.experiences),
        ("projets", content.projects),
        ("formations", content.education),
        ("certifications", content.certifications),
        ("groupes de compétences", content.skill_groups),
        ("centres d'intérêt", content.interests),
    ):
        print(f"  {len(items)} {label}")


if __name__ == "__main__":
    main()
