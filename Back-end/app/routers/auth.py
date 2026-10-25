"""Authentification de l'espace admin (cookie HttpOnly)."""

from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..config import Settings
from ..deps import client_ip, get_db, get_limiter, get_settings, require_admin
from ..mailer import send_account_email
from ..security import (
    RateLimiter,
    create_access_token,
    create_purpose_token,
    decode_access_token,
    hash_password,
    peek_token_subject,
    read_purpose_token,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"

# Ces adresses appartiennent à l'application : un portfolio qui les prendrait
# serait inaccessible, la route de l'app gagnant toujours sur /<slug>.
RESERVED_SLUGS = frozenset(
    {
        "admin",
        "signup",
        "login",
        "logout",
        "api",
        "app",
        "static",
        "assets",
        "about",
        "help",
        "support",
        "contact",
        "settings",
        "account",
        "dashboard",
        "p",
        "new",
        "edit",
        "me",
        "www",
        "mail",
        "blog",
        "docs",
        "legal",
        "privacy",
        "verifier",
        "mot-de-passe-oublie",
        "nouveau-mot-de-passe",
        "compte",
        "export",
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
    bg: BackgroundTasks,
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

    _send_verification(settings, bg, user)

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


def _me_out(user: models.User) -> schemas.MeOut:
    """Seule construction de MeOut : trois copies avaient déjà divergé."""
    return schemas.MeOut(
        username=user.username,
        slug=user.slug,
        email=user.email,
        published=user.published,
        is_staff=user.is_staff,
        email_verified=user.email_verified,
    )


@router.get("/me", response_model=schemas.MeOut)
def me(user: models.User = Depends(require_admin)):
    return _me_out(user)


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
    return _me_out(user)


@router.post("/publish", response_model=schemas.MeOut)
def publish(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    user.published = True
    db.commit()
    db.refresh(user)
    return _me_out(user)


# --- Vérification d'e-mail --------------------------------------------------------
def _send_verification(settings: Settings, bg: BackgroundTasks, user: models.User) -> None:
    token = create_purpose_token(user.id, "verify", settings.secret_key, settings.token_ttl_minutes)
    link = f"{settings.public_base_url.rstrip('/')}/verifier?token={token}"
    bg.add_task(
        send_account_email,
        settings,
        to=user.email,
        subject="Confirme ton adresse e-mail",
        body=f"Bonjour,\n\nConfirme ton adresse pour activer ton portfolio :\n{link}\n\n"
        f"Ce lien expire dans {settings.token_ttl_minutes} minutes.",
    )


@router.post("/verify/request", response_model=schemas.LoginOut)
def request_verification(
    bg: BackgroundTasks,
    settings: Settings = Depends(get_settings),
    user: models.User = Depends(require_admin),
):
    if not user.email_verified:
        _send_verification(settings, bg, user)
    return schemas.LoginOut()


@router.post("/verify/{token}", response_model=schemas.LoginOut)
def confirm_verification(
    token: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    user_id = read_purpose_token(token, "verify", settings.secret_key)
    if user_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lien invalide ou expiré")
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lien invalide ou expiré")
    user.email_verified = True
    db.commit()
    return schemas.LoginOut()


# --- Mot de passe oublié ----------------------------------------------------------
@router.post("/password/forgot", response_model=schemas.LoginOut)
def forgot_password(
    body: schemas.EmailIn,
    request: Request,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    limiter: RateLimiter = Depends(get_limiter),
):
    """Toujours 200 : dire si l'adresse existe révélerait qui a un compte."""
    if not limiter.allow(f"forgot:{client_ip(request)}", settings.login_rate_limit, settings.login_rate_window_s):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de demandes, réessayez plus tard")

    user = db.scalars(select(models.User).where(models.User.email == body.email)).first()
    if user is not None:
        token = create_purpose_token(
            user.id, "reset", settings.secret_key, settings.token_ttl_minutes, fingerprint=user.password_hash
        )
        link = f"{settings.public_base_url.rstrip('/')}/nouveau-mot-de-passe?token={token}"
        bg.add_task(
            send_account_email,
            settings,
            to=user.email,
            subject="Réinitialise ton mot de passe",
            body=f"Bonjour,\n\nPour choisir un nouveau mot de passe :\n{link}\n\n"
            f"Ce lien expire dans {settings.token_ttl_minutes} minutes. "
            "Si tu n'as rien demandé, ignore ce message.",
        )
    return schemas.LoginOut()


@router.post("/password/reset", response_model=schemas.LoginOut)
def reset_password(
    body: schemas.PasswordResetIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    invalid = HTTPException(status.HTTP_400_BAD_REQUEST, "Lien invalide ou expiré")

    # Le hash courant fait partie du jeton : une fois le mot de passe changé,
    # le lien ne vaut plus rien, donc il ne sert qu'une fois.
    user_id = peek_token_subject(body.token, "reset", settings.secret_key)
    user = db.get(models.User, user_id) if user_id else None
    if user is None:
        raise invalid
    if read_purpose_token(body.token, "reset", settings.secret_key, fingerprint=user.password_hash) != user.id:
        raise invalid

    user.password_hash = hash_password(body.password)
    db.commit()
    return schemas.LoginOut()


# --- RGPD -------------------------------------------------------------------------
@router.get("/export")
def export_my_data(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin),
):
    """Toutes les données du compte, dans un format lisible et réutilisable."""
    portfolio = services.build_portfolio(db, user.id)
    messages = db.scalars(select(models.ContactMessage).where(models.ContactMessage.user_id == user.id)).all()
    return {
        "compte": {
            "username": user.username,
            "email": user.email,
            "slug": user.slug,
            "published": user.published,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "portfolio": portfolio.model_dump(mode="json") if portfolio else None,
        "messages_recus": [
            {
                "de": m.name,
                "email": m.email,
                "sujet": m.subject,
                "message": m.message,
                "recu_le": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


@router.post("/account/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    body: schemas.DeleteAccountIn,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    user: models.User = Depends(require_admin),
):
    """Suppression définitive. Le mot de passe est redemandé : c'est irréversible."""
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Mot de passe incorrect")

    # Le contenu part avec le compte via ON DELETE CASCADE.
    db.delete(user)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/api", httponly=True, secure=settings.is_production, samesite="strict")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
