"""Envoi d'e-mail de notification (optionnel)."""

import logging
import smtplib
from email.message import EmailMessage

from .config import Settings

log = logging.getLogger(__name__)


def send_contact_email(settings: Settings, *, name: str, email: str, subject: str, message: str) -> bool:
    """Envoie le message par SMTP. Retourne False si SMTP n'est pas configuré ou échoue.

    Appelé en tâche de fond : une erreur SMTP ne doit jamais faire échouer la requête
    (le message est déjà enregistré en base).
    """
    recipient = settings.contact_to
    if not (settings.smtp_host and recipient):
        log.info("SMTP non configuré : message de %s enregistré uniquement.", email)
        return False

    msg = EmailMessage()
    msg["Subject"] = f"[Portfolio] {subject}"
    msg["From"] = settings.smtp_from or settings.smtp_user or recipient
    msg["To"] = recipient
    msg["Reply-To"] = email
    msg.set_content(f"De : {name} <{email}>\n\n{message}")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
        return True
    except (OSError, smtplib.SMTPException):
        log.exception("Échec d'envoi SMTP")
        return False
