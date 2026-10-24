"""Authentification de l'espace admin (cookie HttpOnly)."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import Settings
from ..deps import client_ip, get_db, get_limiter, get_settings, require_admin
from ..security import RateLimiter, create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"

# Hash factice pour égaliser le temps de réponse quand l'utilisateur n'existe pas.
_DUMMY_HASH = hash_password("dummy-password")


def _set_auth_cookie(response: Response, token: str, expires_in: int, secure: bool) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,  # inaccessible à JavaScript → protège contre le vol par XSS
        secure=secure,  # HTTPS uniquement en production
        samesite="strict",  # bloque le CSRF cross-site
        max_age=expires_in,
        path="/api",  # scope minimal : pas envoyé pour les assets statiques
    )


def _purge_expired_blocklist(db: Session) -> None:
    """Nettoie les entrées expirées pour éviter la croissance illimitée de la table."""
    db.query(models.TokenBlocklist).filter(models.TokenBlocklist.expires_at < datetime.now(UTC)).delete()
    db.commit()


@router.post("/login", response_model=schemas.LoginOut)
def login(
    body: schemas.LoginIn,
    response: Response,
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

    _purge_expired_blocklist(db)

    token, _jti, expires_in = create_access_token(user.username, settings.secret_key, settings.access_token_minutes)
    _set_auth_cookie(response, token, expires_in, secure=settings.is_production)
    return schemas.LoginOut()


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        result = decode_access_token(token, settings.secret_key)
        if result:
            _username, jti = result
            # Insère le JTI en blocklist pour invalider immédiatement ce token.
            if not db.scalars(select(models.TokenBlocklist).where(models.TokenBlocklist.jti == jti)).first():
                from datetime import timedelta

                expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_minutes)
                db.add(models.TokenBlocklist(jti=jti, expires_at=expires_at))
                db.commit()

    response.delete_cookie(COOKIE_NAME, path="/api", httponly=True, secure=settings.is_production, samesite="strict")
    return {"ok": True}


@router.get("/me", response_model=schemas.MeOut)
def me(user: models.AdminUser = Depends(require_admin)):
    return schemas.MeOut(username=user.username)
