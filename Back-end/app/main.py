"""Point d'entrée : `uvicorn app.main:app`."""

import logging
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import Engine, inspect, select

from . import models
from .config import Settings, get_settings
from .database import make_engine, make_session_factory
from .routers import admin, auth, contact, public
from .security import RateLimiter, hash_password
from .seed import seed

log = logging.getLogger("portfolio")


def init_schema(engine: Engine) -> None:
    """Crée le schéma manquant, puis marque la base comme à jour pour Alembic.

    Sans ce stamp, une base créée par l'application (dev : `uvicorn app.main:app`,
    sans passer par le Dockerfile qui lance `alembic upgrade head`) n'a pas de
    ligne alembic_version : la prochaine migration rejouerait 0001 sur des tables
    qui existent déjà et échouerait.
    """
    fresh = not inspect(engine).has_table("alembic_version")
    models.Base.metadata.create_all(engine)

    # Une base en mémoire disparaît avec le process : rien à stamper.
    if not fresh or engine.url.database in (None, ":memory:"):
        return

    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    # set_main_option passe par configparser, qui interprète « % » : un chemin
    # Windows encodé (C%3A/...) ou un mot de passe contenant % casserait sinon.
    url = engine.url.render_as_string(hide_password=False).replace("%", "%%")
    cfg.set_main_option("sqlalchemy.url", url)
    command.stamp(cfg, "head")


def bootstrap_admin(db, settings: Settings) -> None:
    """Crée le compte admin au premier démarrage si ADMIN_USERNAME/ADMIN_PASSWORD sont définis."""
    if not (settings.admin_username and settings.admin_password):
        return
    exists = db.scalars(select(models.User).where(models.User.username == settings.admin_username)).first()
    if exists is None:
        db.add(
            models.User(
                username=settings.admin_username,
                email=f"{settings.admin_username}@local",
                slug=settings.admin_username,
                password_hash=hash_password(settings.admin_password),
                is_staff=True,
                published=True,
            )
        )
        db.commit()
        log.info("Compte admin « %s » créé.", settings.admin_username)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    settings.validate_for_production()

    engine = make_engine(settings.database_url)
    session_factory = make_session_factory(engine)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        init_schema(engine)
        with session_factory() as db:
            # Le compte d'abord : le contenu du seed doit avoir un propriétaire.
            bootstrap_admin(db, settings)
            if settings.seed_on_startup:
                seed(db)
        yield
        engine.dispose()

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/api/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/api/openapi.json",
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.limiter = RateLimiter()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
        allow_credentials=True,  # nécessaire pour que le navigateur envoie le cookie HttpOnly
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return response

    app.include_router(public.router)
    app.include_router(contact.router)
    app.include_router(auth.router)
    app.include_router(admin.router)
    _serve_spa(app)
    return app


# Le build du front, copié à côté de l'app par le Dockerfile.
SPA_DIR = Path(__file__).resolve().parents[1] / "static"


def _serve_spa(app: FastAPI) -> None:
    """Sert le site depuis la même origine que l'API.

    Deux domaines séparés (front sur un hébergeur, API sur un autre) rendraient
    le cookie d'authentification cross-site : en SameSite=strict le navigateur
    ne l'enverrait jamais et la connexion serait impossible. Une seule origine
    évite aussi toute configuration CORS.
    """
    if not SPA_DIR.is_dir():
        return

    app.mount("/assets", StaticFiles(directory=SPA_DIR / "assets"), name="assets")
    index = SPA_DIR / "index.html"

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        # Une route d'API inconnue doit rester une 404 : sans ça le client
        # recevrait la page d'accueil en 200 et tenterait de la lire en JSON.
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(404, "Endpoint inconnu")

        # Un fichier réel (favicon, CV, images) est servi tel quel ; tout le
        # reste retombe sur index.html pour que /<slug> marche au rafraîchissement.
        candidate = (SPA_DIR / full_path).resolve()
        if candidate.is_file() and candidate.is_relative_to(SPA_DIR):
            return FileResponse(candidate)
        if not index.is_file():
            raise HTTPException(404, "Site non construit")
        return FileResponse(index)


app = create_app()
