"""Point d'entrée : `uvicorn app.main:app`."""

import logging
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from . import models
from .config import Settings, get_settings
from .database import make_engine, make_session_factory
from .routers import admin, auth, contact, public
from .security import RateLimiter, hash_password
from .seed import seed

log = logging.getLogger("portfolio")


def bootstrap_admin(db, settings: Settings) -> None:
    """Crée le compte admin au premier démarrage si ADMIN_USERNAME/ADMIN_PASSWORD sont définis."""
    if not (settings.admin_username and settings.admin_password):
        return
    exists = db.scalars(select(models.AdminUser).where(models.AdminUser.username == settings.admin_username)).first()
    if exists is None:
        db.add(models.AdminUser(username=settings.admin_username, password_hash=hash_password(settings.admin_password)))
        db.commit()
        log.info("Compte admin « %s » créé.", settings.admin_username)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    settings.validate_for_production()

    engine = make_engine(settings.database_url)
    session_factory = make_session_factory(engine)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        models.Base.metadata.create_all(engine)
        with session_factory() as db:
            if settings.seed_on_startup:
                seed(db)
            bootstrap_admin(db, settings)
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
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
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
    return app


app = create_app()
