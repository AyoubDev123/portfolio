# --- 1. Build du site --------------------------------------------------------
# Le front est servi par l'API, depuis la même origine : sans ça le cookie
# d'authentification serait cross-site et le navigateur ne l'enverrait jamais.
FROM node:22-slim AS web
WORKDIR /web
COPY Front-end/package.json Front-end/package-lock.json ./
RUN npm ci
COPY Front-end/ ./
ARG VITE_SITE_URL=""
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# --- 2. L'application --------------------------------------------------------
FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY Back-end/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY Back-end/app ./app
COPY Back-end/migrations ./migrations
COPY Back-end/alembic.ini .
COPY --from=web /web/dist ./static

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
