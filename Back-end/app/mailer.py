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


def send_account_email(settings: Settings, *, to: str, subject: str, body: str) -> bool:
    """E-mail transactionnel (vérification, réinitialisation).

    Sans SMTP configuré, le lien est journalisé : en développement on le récupère
    dans la console plutôt que de bloquer le parcours.
    """
    if not settings.smtp_host:
        log.warning("SMTP non configuré — %s pour %s :\n%s", subject, to, body)
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user or to
    msg["To"] = to
    msg.set_content(body)
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
