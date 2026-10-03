"""Formulaire de contact."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import Settings
from ..deps import client_ip, get_db, get_limiter, get_settings
from ..mailer import send_contact_email
from ..security import RateLimiter

router = APIRouter(prefix="/api", tags=["contact"])


@router.post("/contact", response_model=schemas.ContactOut, status_code=status.HTTP_201_CREATED)
def post_contact(
    body: schemas.ContactIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    limiter: RateLimiter = Depends(get_limiter),
):
    # Honeypot : un bot remplit le champ caché. On répond « ok » sans rien enregistrer
    # pour ne pas lui indiquer qu'il a été détecté.
    if body.website:
        return schemas.ContactOut()

    if not limiter.allow(f"contact:{client_ip(request)}", settings.contact_rate_limit, settings.contact_rate_window_s):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de messages envoyés, réessayez plus tard")

    db.add(models.ContactMessage(name=body.name, email=body.email, subject=body.subject, message=body.message))
    db.commit()

    background.add_task(
        send_contact_email,
        settings,
        name=body.name,
        email=body.email,
        subject=body.subject,
        message=body.message,
    )
    return schemas.ContactOut()
