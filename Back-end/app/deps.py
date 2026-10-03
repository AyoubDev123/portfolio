"""Dépendances FastAPI (session DB, settings, auth)."""

from collections.abc import Iterator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .config import Settings
from .security import RateLimiter, decode_access_token

_COOKIE = "access_token"


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request) -> Iterator[Session]:
    db = request.app.state.session_factory()
    try:
        yield db
    finally:
        db.close()


def get_limiter(request: Request) -> RateLimiter:
    return request.app.state.limiter


def client_ip(request: Request) -> str:
    # Derrière un reverse proxy, configurer uvicorn avec --proxy-headers.
    return request.client.host if request.client else "unknown"


def require_admin(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> models.AdminUser:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentification requise")

    token = request.cookies.get(_COOKIE)
    if not token:
        raise unauthorized

    result = decode_access_token(token, settings.secret_key)
    if result is None:
        raise unauthorized

    username, jti = result

    # Vérifie que le token n'a pas été révoqué (logout ou rotation).
    blocked = db.scalars(select(models.TokenBlocklist).where(models.TokenBlocklist.jti == jti)).first()
    if blocked:
        raise unauthorized

    user = db.scalars(select(models.AdminUser).where(models.AdminUser.username == username)).first()
    if user is None:
        raise unauthorized
    return user
