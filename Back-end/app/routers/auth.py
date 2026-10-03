"""Authentification de l'espace admin."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import Settings
from ..deps import client_ip, get_db, get_limiter, get_settings, require_admin
from ..security import RateLimiter, create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Hash factice pour égaliser le temps de réponse quand l'utilisateur n'existe pas.
_DUMMY_HASH = hash_password("dummy-password")


@router.post("/login", response_model=schemas.TokenOut)
def login(
    body: schemas.LoginIn,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    limiter: RateLimiter = Depends(get_limiter),
):
    if not limiter.allow(f"login:{client_ip(request)}", settings.login_rate_limit, settings.login_rate_window_s):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives, réessayez plus tard")

    user = db.scalars(select(models.AdminUser).where(models.AdminUser.username == body.username)).first()
    ok = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)
    if not (user and ok):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants invalides")

    token, expires_in = create_access_token(user.username, settings.secret_key, settings.access_token_minutes)
    return schemas.TokenOut(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=schemas.MeOut)
def me(user: models.AdminUser = Depends(require_admin)):
    return schemas.MeOut(username=user.username)
