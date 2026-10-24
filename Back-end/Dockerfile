FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini .
RUN useradd --create-home appuser && mkdir /data && chown appuser /data
USER appuser
ENV DATABASE_URL=sqlite:////data/portfolio.db
VOLUME ["/data"]
EXPOSE 8000
# Le proxy de l'hébergeur n'est pas sur la loopback : sans ça uvicorn ignore
# X-Forwarded-For et tous les visiteurs partagent le même compteur de rate limit.
ENV FORWARDED_ALLOW_IPS=*
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/api/health')" || exit 1
# Lance les migrations avant le serveur : idempotent, safe à chaque restart.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
