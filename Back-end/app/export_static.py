"""Exporte le contenu au format de l'API (`GET /api/portfolio`) en JSON statique.

Le front l'embarque comme solution de repli : si l'API est injoignable (hébergement
statique, panne), le site s'affiche quand même. Un test vérifie que le fichier versionné
est toujours synchronisé avec `content.json`.

    python -m app.export_static [chemin_de_sortie]
"""

import json
import sys
from pathlib import Path

from . import models
from .database import make_engine, make_session_factory
from .seed import seed
from .services import build_portfolio

DEFAULT_OUT = Path(__file__).resolve().parents[2] / "Front-end" / "src" / "data" / "portfolio.static.json"


def render_static_json() -> str:
    engine = make_engine("sqlite://")
    models.Base.metadata.create_all(engine)
    with make_session_factory(engine)() as db:
        seed(db)
        portfolio = build_portfolio(db)
    assert portfolio is not None
    return json.dumps(portfolio.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n"


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_static_json(), encoding="utf-8")
    print(f"Écrit : {out}")


if __name__ == "__main__":
    main()
