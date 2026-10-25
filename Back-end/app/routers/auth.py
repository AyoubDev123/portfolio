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

# Ces adresses appartiennent à l'application : un portfolio qui les prendrait
# serait inaccessible, la route de l'app gagnant toujours sur /<slug>.
RESERVED_SLUGS = frozenset(
    {
        "admin", "signup", "login", "logout", "api", "app", "static", "assets",
        "about", "help", "support", "contact", "settings", "account", "dashboard",
        "p", "new", "edit", "me", "www", "mail", "blog", "docs", "legal", "privacy",
    }
)


def _reject_reserved(slug: str) -> None:
    if slug in RESERVED_SLUGS:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cette adresse est réservée")

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


@router.post("/signup", response_model=schemas.LoginOut, status_code=status.HTTP_201_CREATED)
def signup(
    body: schemas.SignupIn,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    limiter: RateLimiter = Depends(get_limiter),
):
    """Crée un compte, son profil vide, et connecte directement."""
    if not limiter.allow(f"signup:{client_ip(request)}", settings.login_rate_limit, settings.login_rate_window_s):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives, réessayez plus tard")

    _reject_reserved(body.username)
    taken = db.scalars(
        select(models.User).where((models.User.username == body.username) | (models.User.email == body.email))
    ).first()
    if taken is not None:
        # Message identique pour les deux cas : dire lequel révélerait qui a un compte.
        raise HTTPException(status.HTTP_409_CONFLICT, "Cet identifiant ou cet e-mail est déjà utilisé")

    user = models.User(
        username=body.username,
        email=body.email,
        slug=body.username,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.flush()
    db.add(
        models.Profile(
            user_id=user.id,
            first_name=body.first_name,
            last_name=body.last_name,
            headline="",
            tagline="",
            email=body.email,
        )
    )
    db.commit()
    db.refresh(user)

    token, _jti, expires_in = create_access_token(user.username, settings.secret_key, settings.access_token_minutes)
    _set_auth_cookie(response, token, expires_in, secure=settings.is_production)
    return schemas.LoginOut()


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

    user = db.scalars(select(models.User).where(models.User.username == body.username)).first()
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
def me(user: models.User = Depends(require_admin)):
    return schemas.MeOut(
        username=user.username,
        slug=user.slug,
        email=user.email,
        published=user.published,
        is_staff=user.is_staff,
    )


@router.put("/slug", response_model=schemas.MeOut)
def change_slug(
    body: schemas.SlugIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    """Change l'adresse publique du portfolio."""
    _reject_reserved(body.slug)
    clash = db.scalars(select(models.User).where(models.User.slug == body.slug, models.User.id != user.id)).first()
    if clash is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cette adresse est déjà prise")
    user.slug = body.slug
    db.commit()
    db.refresh(user)
    return schemas.MeOut(
        username=user.username,
        slug=user.slug,
        email=user.email,
        published=user.published,
        is_staff=user.is_staff,
    )


@router.post("/publish", response_model=schemas.MeOut)
def publish(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    user.published = True
    db.commit()
    db.refresh(user)
    return schemas.MeOut(
        username=user.username,
        slug=user.slug,
        email=user.email,
        published=user.published,
        is_staff=user.is_staff,
    )
