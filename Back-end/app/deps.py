"""Dépendances FastAPI (session DB, settings, auth)."""

from collections.abc import Iterator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .config import Settings
from .security import RateLimiter, decode_access_token

bearer = HTTPBearer(auto_error=False)


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
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> models.AdminUser:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Authentification requise",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise unauthorized
    username = decode_access_token(creds.credentials, settings.secret_key)
    if username is None:
        raise unauthorized
    user = db.scalars(select(models.AdminUser).where(models.AdminUser.username == username)).first()
    if user is None:
        raise unauthorized
    return user
