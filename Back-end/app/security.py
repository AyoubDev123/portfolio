"""Hash de mot de passe, JWT et rate limiting."""

import time
import uuid
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from threading import Lock

import bcrypt
import jwt

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_access_token(subject: str, secret: str, minutes: int) -> tuple[str, str, int]:
    """Retourne (token, jti, expires_in_seconds)."""
    jti = str(uuid.uuid4())
    expires = timedelta(minutes=minutes)
    payload = {
        "sub": subject,
        "jti": jti,
        "exp": datetime.now(UTC) + expires,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM), jti, int(expires.total_seconds())


def decode_access_token(token: str, secret: str) -> tuple[str, str] | None:
    """Retourne (username, jti) ou None si le token est invalide/expiré."""
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    jti = payload.get("jti")
    if not isinstance(sub, str) or not isinstance(jti, str):
        return None
    return sub, jti


class RateLimiter:
    """Fenêtre glissante en mémoire, par clé (ex. IP).

    max_keys borne la mémoire utilisée : au-delà, la clé la plus ancienne est
    évincée avant d'en accepter une nouvelle, ce qui empêche un attaquant de
    saturer la RAM en spammant avec des milliers d'adresses IP spoofées.

    Pour du multi-instances, déplacer l'état dans Redis.
    """

    def __init__(self, max_keys: int = 50_000) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()
        self._max_keys = max_keys

    def allow(self, key: str, limit: int, window_s: int) -> bool:
        now = time.monotonic()
        with self._lock:
            if key not in self._hits and len(self._hits) >= self._max_keys:
                # Évince la clé la plus ancienne (order of insertion dans dict Python 3.7+)
                oldest = next(iter(self._hits))
                del self._hits[oldest]

            q = self._hits[key]
            while q and now - q[0] > window_s:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
