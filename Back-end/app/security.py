"""Hash de mot de passe, JWT et rate limiting."""

import time
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


def create_access_token(subject: str, secret: str, minutes: int) -> tuple[str, int]:
    expires = timedelta(minutes=minutes)
    payload = {"sub": subject, "exp": datetime.now(UTC) + expires, "iat": datetime.now(UTC)}
    return jwt.encode(payload, secret, algorithm=ALGORITHM), int(expires.total_seconds())


def decode_access_token(token: str, secret: str) -> str | None:
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


class RateLimiter:
    """Fenêtre glissante en mémoire, par clé (ex. IP).

    Suffisant pour une instance unique ; pour du multi-instances, déplacer l'état
    dans Redis (voir README, section « Pistes d'évolution »).
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, limit: int, window_s: int) -> bool:
        now = time.monotonic()
        with self._lock:
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
