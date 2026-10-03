# Portfolio · Ayoub El Abbassi

Portfolio d'apprenti ingénieur (CY Tech, mathématiques appliquées) et Data Scientist / Engineer.
Version finale, issue de la refonte du portfolio PHP/MySQL réalisé au S6 du BUT Science des Données
(soutenance du 10/02/2026) vers une architecture découplée **React + FastAPI**.

```
Front-end/   React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router     (port 5173 en dev)
Back-end/    FastAPI · SQLAlchemy 2 · Pydantic v2 · SQLite (PostgreSQL possible)   (port 8000)
```

## Démarrage rapide

**Développement** (deux terminaux) :

```bash
# 1. API
cd Back-end
python -m venv .venv && source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                      # renseigner ADMIN_USERNAME / ADMIN_PASSWORD pour l'espace admin
uvicorn app.main:app --reload                             # http://localhost:8000/api/docs

# 2. Front
cd Front-end
npm install
npm run dev                                               # http://localhost:5173 (proxy /api → :8000)
```

Au premier démarrage, la base SQLite est créée et remplie depuis `Back-end/app/data/content.json`.

**Avec VS Code** : ouvre le dossier, puis `Terminal > Exécuter la tâche…` : « API : installer », « Front : installer »,
puis « Tout lancer (API + Front) ». Les tâches « Tests API » et « Tests Front » sont aussi prévues.

**Production locale avec Docker** :

```bash
cp .env.example .env     # SECRET_KEY (32+ car.), ADMIN_USERNAME, ADMIN_PASSWORD (12+ car.)
docker compose up --build
# site : http://localhost:8080 · admin : http://localhost:8080/admin
```

## Modifier le contenu

Deux options :

1. **Espace admin** (`/admin`) : CRUD de toutes les sections (profil, expériences, projets, compétences,
   formations, certifications, intérêts) + lecture des messages du formulaire de contact.
2. **Fichier `Back-end/app/data/content.json`** : source de vérité du contenu initial. Après modification :

   ```bash
   cd Back-end
   python -m app.seed --reset            # recharge la base locale
   python -m app.export_static           # régénère Front-end/src/data/portfolio.static.json
   ```

Le test `test_static_export_is_in_sync` échoue si le JSON statique du front n'est pas à jour.

## Architecture et choix techniques

| Sujet | Choix | Pourquoi |
|---|---|---|
| API | FastAPI + Pydantic v2 | Contrat typé, OpenAPI généré (`/api/docs` hors production). |
| Données | SQLAlchemy 2 + SQLite | Zéro configuration ; `DATABASE_URL` permet de passer à PostgreSQL. |
| Modèle | Évolution du MCD du v1 | Les tables de liaison many-to-many (compétences ↔ outils ↔ projets) sont devenues des colonnes JSON : ces listes ne sont ni jointes ni filtrées côté SQL. |
| CRUD admin | Fabrique de routeurs générique | Un seul code testé pour 6 entités, là où le v1 avait un fichier PHP par table. |
| Auth | JWT (HS256) + bcrypt | Compte créé au démarrage depuis l'environnement, jamais en dur ; erreur uniforme et hash factice contre l'énumération d'utilisateurs. |
| Anti-abus | Rate limiting (login, contact) + honeypot | Fenêtre glissante en mémoire (instance unique, voir pistes d'évolution). |
| Contact | Stockage en base + e-mail SMTP optionnel en tâche de fond | Un message n'est jamais perdu si le SMTP est en panne ; protection contre l'injection d'en-têtes. |
| Résilience | Export statique embarqué dans le front | Le site s'affiche instantanément et reste fonctionnel si l'API est injoignable (hébergement statique, panne). |
| Front | Tailwind 4 + tokens CSS, thème clair/sombre | Accessibilité : landmarks, lien d'évitement, focus visibles, `prefers-reduced-motion`, textes alternatifs. |
| Admin UI | Formulaires générés depuis des schémas déclaratifs | Aucune page à écrire par entité ; chargée à la demande (code splitting). |

## Qualité

```bash
cd Back-end  && ruff check . && ruff format --check . && pytest      # 32 tests
cd Front-end && npm run typecheck && npm test && npm run build       # 14 tests
```

La CI GitHub Actions (`.github/workflows/ci.yml`) exécute ces vérifications puis construit les images Docker.

## Mettre en ligne

Le front est un site statique, l'API un conteneur Docker : on les héberge séparément (gratuit pour un portfolio).

1. **API sur Render** : crée un « Blueprint » depuis ce dépôt (`render.yaml`), renseigne `ADMIN_USERNAME`,
   `ADMIN_PASSWORD` (12 caractères min.) et `CORS_ORIGINS` (l'adresse du front, voir étape 2). `SECRET_KEY` est généré.
   Sur l'offre gratuite le disque est éphémère : ajoute une base PostgreSQL gratuite et colle sa chaîne de connexion
   dans `DATABASE_URL`, sinon les modifications faites dans `/admin` et les messages reçus sont perdus à chaque redéploiement.
2. **Front sur Vercel** (ou Netlify) : importe le dépôt, dossier racine `Front-end`, commande `npm run build`, sortie `dist`.
   Variables : `VITE_API_URL` = adresse de l'API Render, `VITE_SITE_URL` = adresse publique du site (image d'aperçu LinkedIn).
3. Reviens à l'étape 1 renseigner `CORS_ORIGINS` avec l'adresse définitive du front.

Sans API, le site fonctionne quand même grâce à l'export statique ; seuls le formulaire de contact et `/admin` en dépendent.

## Mettre sur GitHub

```bash
git init -b main && git add -A && git commit -m "Portfolio final"
git remote add origin https://github.com/<ton-compte>/portfolio.git && git push -u origin main
```

La CI se lance toute seule. Pense à renseigner ensuite `github` et `linkedin` dans `/admin` (onglet Profil).

## Sécurité : à savoir avant de déployer

- `SECRET_KEY` doit être défini en production (l'API refuse de démarrer avec la valeur par défaut).
- Servir derrière HTTPS (reverse proxy) ; l'image back-end démarre avec `--proxy-headers`.
- Le rate limiting est en mémoire : suffisant pour une instance, à déplacer dans Redis si l'API est répliquée.
- Les tokens admin sont stockés en `sessionStorage` (durée de vie : l'onglet) ; 60 minutes de validité.

## À compléter

- `linkedin` et `github` dans le profil (champs vides = liens masqués sur le site).
- Détail des missions chez Safran Aircraft Engines (le contenu actuel reste volontairement générique).
- Liens vers les dépôts ou démos des projets (champ `links` de chaque projet).
- Les schémas des projets RAG (Inventiv IT, Renault) sont des illustrations simplifiées : remplace-les par de vraies captures si le contenu n'est pas confidentiel.

## Pistes d'évolution

Migrations Alembic, rate limiting Redis, upload d'images depuis l'admin, i18n FR/EN, tests end-to-end Playwright.
