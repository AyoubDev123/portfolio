"""Exporte le contenu au format de l'API (`GET /api/portfolio`) en JSON statique.

Le front l'embarque comme solution de repli : si l'API est injoignable (hébergement
statique, panne), le site s'affiche quand même.

Deux modes :
- `export_from_session(db, path)` : exporte depuis une session existante (appelé en
  arrière-plan après chaque mutation admin pour garder le snapshot à jour).
- `main()` : CLI qui crée une DB in-memory à partir du seed (utilisé en CI/build).

    python -m app.export_static [chemin_de_sortie]
"""

import json
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from . import models
from .database import make_engine, make_session_factory
from .seed import seed
from .services import build_portfolio

DEFAULT_OUT = Path(__file__).resolve().parents[2] / "Front-end" / "src" / "data" / "portfolio.static.json"


def _to_json(db: Session) -> str | None:
    portfolio = build_portfolio(db)
    if portfolio is None:
        return None
    return json.dumps(portfolio.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n"


def export_from_session(db: Session, out_path: Path) -> None:
    """Régénère le snapshot depuis une session DB live.

    Appelé en tâche de fond après chaque mutation admin pour que le fallback
    statique reflète toujours le contenu le plus récent.
    """
    content = _to_json(db)
    if content is None:
        return
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")


def render_static_json() -> str:
    """Génère le JSON depuis une DB in-memory alimentée par le seed (usage CI)."""
    engine = make_engine("sqlite://")
    models.Base.metadata.create_all(engine)
    with make_session_factory(engine)() as db:
        seed(db)
        content = _to_json(db)
    assert content is not None
    return content


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_static_json(), encoding="utf-8")
    print(f"Écrit : {out}")


if __name__ == "__main__":
    main()
