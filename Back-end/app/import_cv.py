"""POC : transforme un CV PDF en contenu de portfolio (format app/data/content.json).

    python -m app.import_cv chemin/vers/cv.pdf [-o sortie.json]

Le PDF est envoyé tel quel au modèle (pas d'extraction de texte en amont) : la mise
en page compte pour comprendre un CV, surtout sur deux colonnes. La sortie est
contrainte par les schémas Pydantic de l'API, donc elle est soit valide, soit en erreur
— jamais du JSON approximatif.
"""

import argparse
import base64
import json
import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel, Field

from .schemas import (
    SLUG,
    CertificationBase,
    EducationBase,
    ExperienceBase,
    InterestBase,
    ProfileBase,
    SkillGroupBase,
)

MODEL = "claude-opus-5"
DEFAULT_OUT = Path(__file__).parent / "data" / "content.generated.json"


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
    profile: ProfileBase
    experiences: list[ExperienceBase] = []
    projects: list[ProjectImport] = []
    skill_groups: list[SkillGroupBase] = []
    education: list[EducationBase] = []
    certifications: list[CertificationBase] = []
    interests: list[InterestBase] = []


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


def build(pdf: Path, client: anthropic.Anthropic) -> PortfolioImport:
    data = base64.standard_b64encode(pdf.read_bytes()).decode("utf-8")
    response = client.messages.parse(
        model=MODEL,
        max_tokens=16000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {"type": "base64", "media_type": "application/pdf", "data": data},
                    },
                    {"type": "text", "text": PROMPT},
                ],
            }
        ],
        output_format=PortfolioImport,
    )
    usage = response.usage
    cost = usage.input_tokens * 5e-6 + usage.output_tokens * 25e-6
    print(
        f"{usage.input_tokens} tokens en entrée, {usage.output_tokens} en sortie "
        f"(~{cost:.2f} $)",
        file=sys.stderr,
    )
    return response.parsed_output


def main() -> None:
    parser = argparse.ArgumentParser(description="CV PDF -> contenu de portfolio")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("-o", "--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    if not args.pdf.is_file():
        sys.exit(f"Fichier introuvable : {args.pdf}")

    content = build(args.pdf, anthropic.Anthropic())

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
