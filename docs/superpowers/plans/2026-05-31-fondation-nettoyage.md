# Chantier « Fondation + nettoyages sûrs » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer les pièges « fondation » du dépôt Atelier St-Elme (fallbacks d'auth faibles, `npm run build` cassé, données de cours fantômes, code mort) sans changer le comportement observable de la production.

**Architecture:** Site statique Markdown + Jinja2 généré par Python (`scripts/core/build.py`), styles SCSS via Grunt, prod sur Netlify (fonction Node `api.mjs` + Neon Postgres). Backend FastAPI dev-only en doublon. Les changements sont des correctifs ciblés + suppressions de fichiers morts ; chaque tâche est un commit atomique réversible.

**Tech Stack:** Node 18 / Netlify Functions, Python 3.11 / FastAPI (dev), Grunt, pytest, git.

**Branche:** `chantier/fondation-nettoyage` (déjà créée ; le spec y est committé : `ea074ed`).

**Spec source:** `docs/superpowers/specs/2026-05-31-fondation-nettoyage-design.md`

---

## Note sur la stratégie de vérification (lire avant de commencer)

Les surfaces touchées (fonction Netlify, backend FastAPI, `package.json`, `.gitignore`,
suppressions de fichiers, doc) **n'ont aucun harnais de test existant**, et en ajouter un sort
du périmètre de ce chantier (ce serait un chantier « couverture de tests » à part). La
vérification s'appuie donc sur :

- **`git grep`** pour prouver l'absence de fallback dangereux et de références au code mort ;
- **la suite `pytest` existante (~246 tests)** comme filet pour la suppression des legacy
  (les tests importent `from core.X` / `from utils.X`) ;
- **`npx grunt build`** pour prouver que le build produit un `dist/` complet ;
- **smoke manuel** (`npm run dev:py`) pour valider `dev_server.py`.

Chaque commit utilise le trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Structure des fichiers (carte des changements)

| Fichier | Action | Responsabilité après changement |
|---|---|---|
| `package.json` | Modifier (l.14) | `npm run build` = alias de `grunt build` (ordre correct) |
| `netlify/functions/api.mjs` | Modifier (l.18-19, login, bloc admin) | Auth prod sans fallback, fail-closed sur `/api/admin/*` |
| `backend/app/auth.py` | Modifier (l.8, 11, fonctions) | Auth dev sans fallback, fail-closed |
| `backend/app/routers/admin_api.py` | Modifier (login l.25-29) | 500 explicite si auth non configurée |
| `backend/.env.example` | Modifier | Documente `SECRET_KEY`/`ADMIN_PASSWORD` requis en dev |
| `src/data/courses.yaml` | Supprimer | (donnée morte) |
| `AGENTS.md` | Modifier | Source des cours = admin web → Neon ; plus de `courses.yaml` |
| `scripts/{12 fichiers}.py` | Supprimer | (doublons morts) |
| `cours.html` | Déplacer → `docs/reference/ancien-site-cours.html` | Référence de contenu hors racine |
| `docs/reference/README.md` | Créer | Explique l'archive |
| `.gitignore` | Modifier | Ignore `*.db` |
| `atelier_cours.db`, `backend/atelier_cours.db` | `git rm --cached` | Hors suivi git (fichier local conservé) |

---

## Task 1 : Corriger le piège `npm run build`

**Files:**
- Modify: `package.json:14`

- [ ] **Step 1 : Remplacer la commande `build`**

Remplacer dans `package.json` :
```json
        "build": "grunt sass:prod && python scripts/core/build.py --build",
```
par :
```json
        "build": "grunt build",
```

- [ ] **Step 2 : Vérifier que `npm run build` produit un `dist/` complet**

Run : `npm run build`
Expected : se termine sans erreur ; `dist/styles/main.min.css` existe ET des
`dist/**/index.html` sont régénérés.

Vérification CSS présent :
```bash
ls dist/styles/main.min.css
```
Expected : le fichier est listé (avant le correctif, il était absent ou vide).

- [ ] **Step 3 : Commit**

```bash
git add package.json
git commit -m "fix: npm run build alias grunt build (evite rmtree apres sass)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : Sécurité — `netlify/functions/api.mjs` (prod)

**Files:**
- Modify: `netlify/functions/api.mjs` (l.18-19 ; handler login ~l.265 ; bloc admin ~l.279)

- [ ] **Step 1 : Retirer les fallbacks**

Remplacer :
```js
const SECRET_KEY = process.env.SECRET_KEY || "change-me-in-production";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
```
par :
```js
const SECRET_KEY = process.env.SECRET_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
```

- [ ] **Step 2 : Garde fail-closed dans le handler de login**

> Critique : sans cette garde, si `ADMIN_PASSWORD` est `undefined` (variable absente),
> un client qui n'envoie PAS de champ `password` déclenche `undefined !== undefined` → `false`
> → token émis. La garde doit précéder la comparaison.

Remplacer :
```js
    // POST /api/admin/login
    if (method === "POST" && pathname === "/api/admin/login") {
      let body;
```
par :
```js
    // POST /api/admin/login
    if (method === "POST" && pathname === "/api/admin/login") {
      if (!SECRET_KEY || !ADMIN_PASSWORD) {
        return errorResponse("Authentification non configurée", 500, req);
      }
      let body;
```

- [ ] **Step 3 : Garde fail-closed sur le bloc des routes admin protégées**

Remplacer :
```js
    // Protected admin routes
    if (pathname.startsWith("/api/admin/")) {
      if (!verifyToken(req)) {
        return errorResponse("Non autorisé", 401, req);
      }
```
par :
```js
    // Protected admin routes
    if (pathname.startsWith("/api/admin/")) {
      if (!SECRET_KEY || !ADMIN_PASSWORD) {
        return errorResponse("Authentification non configurée", 500, req);
      }
      if (!verifyToken(req)) {
        return errorResponse("Non autorisé", 401, req);
      }
```

- [ ] **Step 4 : Vérifier qu'aucun fallback ne subsiste**

Run : `git grep -n "change-me-in-production" -- netlify/`
Expected : aucun résultat.

Run : `git grep -n 'process.env.ADMIN_PASSWORD' -- netlify/functions/api.mjs`
Expected : une seule ligne, sans ` || `.

- [ ] **Step 5 : Commit**

```bash
git add netlify/functions/api.mjs
git commit -m "fix(securite): api.mjs sans fallback admin + fail-closed sur /api/admin" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : Sécurité — backend FastAPI (dev-only, cohérence)

**Files:**
- Modify: `backend/app/auth.py:8,11` + `create_access_token` + `decode_token`
- Modify: `backend/app/routers/admin_api.py:12,25-29`
- Modify: `backend/.env.example`

- [ ] **Step 1 : Retirer les fallbacks dans `auth.py`**

Remplacer :
```python
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
```
par :
```python
SECRET_KEY = os.getenv("SECRET_KEY")
```
Et remplacer :
```python
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
```
par :
```python
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
```

- [ ] **Step 2 : Fail-closed dans `create_access_token` et `decode_token`**

Remplacer :
```python
def create_access_token() -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": "admin", "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def decode_token(token: str) -> bool:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub") == "admin"
    except JWTError:
        return False
```
par :
```python
def create_access_token() -> str:
    if not SECRET_KEY:
        raise HTTPException(status_code=500, detail="Authentification non configurée")
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": "admin", "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def decode_token(token: str) -> bool:
    if not SECRET_KEY:
        return False
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub") == "admin"
    except JWTError:
        return False
```

- [ ] **Step 3 : Garde explicite au login (`admin_api.py`)**

Remplacer la ligne d'import (l.12) :
```python
from app.auth import get_current_admin, create_access_token, ADMIN_PASSWORD
```
par :
```python
from app.auth import get_current_admin, create_access_token, ADMIN_PASSWORD, SECRET_KEY
```
Puis remplacer le handler (l.25-29) :
```python
@router.post("/login")
def admin_login(body: LoginRequest):
    if body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return {"access_token": create_access_token(), "token_type": "bearer"}
```
par :
```python
@router.post("/login")
def admin_login(body: LoginRequest):
    if not SECRET_KEY or not ADMIN_PASSWORD:
        raise HTTPException(status_code=500, detail="Authentification non configurée")
    if body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return {"access_token": create_access_token(), "token_type": "bearer"}
```

- [ ] **Step 4 : Documenter les variables requises dans `backend/.env.example`**

Remplacer :
```
# SECRET_KEY=change-me-in-production
# ADMIN_PASSWORD=admin
```
par :
```
# REQUIS pour l'admin (sinon /api/admin/login répond 500) — choisir des valeurs fortes :
# SECRET_KEY=<chaine-aleatoire-longue>
# ADMIN_PASSWORD=<mot-de-passe-fort>
```

- [ ] **Step 5 : Vérifier qu'aucun fallback ne subsiste côté backend**

Run : `git grep -n "change-me-in-production" -- backend/`
Expected : aucun résultat.

Run : `git grep -n '"admin")' -- backend/app/auth.py`
Expected : aucun résultat.

- [ ] **Step 6 : Commit**

```bash
git add backend/app/auth.py backend/app/routers/admin_api.py backend/.env.example
git commit -m "fix(securite): backend auth sans fallback + fail-closed (coherence dev)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 : Source de vérité des cours — supprimer `courses.yaml` + doc

**Files:**
- Delete: `src/data/courses.yaml`
- Modify: `AGENTS.md`

- [ ] **Step 1 : Confirmer une dernière fois que `courses.yaml` n'est lu par aucun code**

Run : `git grep -n "courses.yaml"`
Expected : seules des occurrences dans `AGENTS.md` (et plus dans le code) — confirmé à la
conception. Si une occurrence apparaît dans `scripts/` ou `backend/`, STOP et réévaluer.

- [ ] **Step 2 : Supprimer le fichier mort**

```bash
git rm src/data/courses.yaml
```

- [ ] **Step 3 : Mettre à jour `AGENTS.md` — arborescence `src/data/`**

Remplacer :
```
  data/                  # translations.yaml, courses.yaml…
```
par :
```
  data/                  # translations.yaml, projects.yaml
```

- [ ] **Step 4 : Mettre à jour `AGENTS.md` — section « Modifier les cours affichés »**

Remplacer :
```
**Modifier les cours affichés :** données en base (Neon) ou scripts seed/migrations dans `backend/` ; la liste sur `/cours` vient de l’API.
```
par :
```
**Modifier les cours affichés :** l’autorité est l’**admin web** (écrit dans Neon ; la liste sur `/cours` vient de l’API à l’exécution). `horaire-printemps-2026.json` + `intensifs.json` ne sont qu’un **seed initial historique** consommé par `backend/seed_courses.py`. **Ne pas éditer de YAML pour les cours** (il n’y en a plus).
```

- [ ] **Step 5 : Commit**

```bash
git add AGENTS.md src/data/courses.yaml
git commit -m "chore: supprime courses.yaml mort + doc source des cours (admin->Neon)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 : Supprimer les 12 scripts legacy morts

**Files:**
- Delete: `scripts/build.py`, `scripts/config_loader.py`, `scripts/frontmatter_parser.py`,
  `scripts/gallery_builder.py`, `scripts/gallery_utils.py`, `scripts/glossary_builder.py`,
  `scripts/metadata.py`, `scripts/page_builder.py`, `scripts/post_builder.py`,
  `scripts/server.py`, `scripts/static_file_manager.py`, `scripts/utils.py`
- Conserver : `scripts/dev_server.py` et tous les packages `scripts/core/`, `scripts/builders/`, `scripts/utils/`.

- [ ] **Step 1 : Confirmer la non-référence des 12 fichiers à plat**

Run :
```bash
git grep -nE "scripts/(build|config_loader|frontmatter_parser|gallery_builder|gallery_utils|glossary_builder|metadata|page_builder|post_builder|server|static_file_manager|utils)\.py" -- ':!docs/superpowers/'
```
Expected : aucun résultat (le build appelle `scripts/core/build.py` ; les imports passent par
les packages `core/`/`builders/`/`utils/`).

- [ ] **Step 2 : Supprimer les 12 fichiers**

```bash
git rm scripts/build.py scripts/config_loader.py scripts/frontmatter_parser.py \
       scripts/gallery_builder.py scripts/gallery_utils.py scripts/glossary_builder.py \
       scripts/metadata.py scripts/page_builder.py scripts/post_builder.py \
       scripts/server.py scripts/static_file_manager.py scripts/utils.py
```

- [ ] **Step 3 : Nettoyer les `.pyc` orphelins locaux (non suivis)**

```bash
python -c "import pathlib; [p.unlink() for p in pathlib.Path('scripts/__pycache__').glob('*.pyc')] if pathlib.Path('scripts/__pycache__').exists() else None"
```
Note : `scripts/__pycache__/` n'est pas suivi par git (`.gitignore` ignore `__pycache__/`),
donc aucune action git ici — c'est purement local pour éviter la confusion.

- [ ] **Step 4 : Lancer la suite de tests (filet de sécurité)**

Run : `pytest`
Expected : ~246 tests PASS, 0 erreur d'import. Si un `ModuleNotFoundError` apparaît, STOP :
un test importait un fichier à plat — `git restore --staged --worktree` le fichier concerné
et réévaluer.

- [ ] **Step 5 : Vérifier que `dev_server.py` démarre encore**

Run : `python scripts/dev_server.py --help`
Expected : affiche l'aide sans `ModuleNotFoundError` (valide `from utils.logger import setup_logging`
via le package `scripts/utils/`).

- [ ] **Step 6 : Commit**

```bash
git add -A scripts/
git commit -m "chore: supprime 12 scripts legacy morts (doublons de scripts/core)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 : Archiver `cours.html` hors de la racine

**Files:**
- Move: `cours.html` → `docs/reference/ancien-site-cours.html`
- Create: `docs/reference/README.md`

- [ ] **Step 1 : Créer le dossier et déplacer (en préservant l'historique git)**

```bash
mkdir -p docs/reference
git mv cours.html docs/reference/ancien-site-cours.html
```

- [ ] **Step 2 : Créer `docs/reference/README.md`**

Contenu exact :
```markdown
# Références

Fichiers conservés comme référence, **non utilisés par le build**.

- `ancien-site-cours.html` — export WordPress/Yoast de l'ancienne page
  `atelierstelme.ca/cours/`, gardé comme référence de contenu lors de la migration.
```

- [ ] **Step 3 : Vérifier que la racine est nettoyée et que rien ne référence l'ancien chemin**

Run : `git grep -n "cours.html" -- ':!docs/'`
Expected : aucun résultat (aucun code ne pointait vers la racine `cours.html`).

- [ ] **Step 4 : Commit**

```bash
git add docs/reference/README.md
git commit -m "chore: archive cours.html (export WordPress) dans docs/reference" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 : Sortir les bases SQLite du suivi git

**Files:**
- Modify: `.gitignore`
- Untrack: `atelier_cours.db`, `backend/atelier_cours.db`

- [ ] **Step 1 : Ajouter `*.db` au `.gitignore`**

Ajouter après la ligne `*.cache` (section « Fichiers de cache ») le bloc :
```
# Bases SQLite locales (régénérées par seed/migrations — ne pas versionner)
*.db
```

- [ ] **Step 2 : Retirer les `.db` du suivi (sans supprimer le fichier local)**

```bash
git rm --cached atelier_cours.db
git rm --cached backend/atelier_cours.db
```
Note : `--cached` retire de l'index uniquement ; les fichiers `.db` restent sur le disque pour
le dev local.

- [ ] **Step 3 : Vérifier**

Run : `git status --short`
Expected : `D  atelier_cours.db`, `D  backend/atelier_cours.db`, `M  .gitignore` ; les fichiers
existent toujours sur disque (`ls atelier_cours.db` → présent).

Run : `git check-ignore atelier_cours.db`
Expected : `atelier_cours.db` (désormais ignoré).

- [ ] **Step 4 : Commit**

```bash
git add .gitignore
git commit -m "chore: sort les bases SQLite du suivi git + ignore *.db" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7b : Détracker les artefacts générés (`__pycache__` + `.netlify`)

> **Découvert pendant l'exécution (Task 3)** : ~90 fichiers `.pyc` dans 9 dossiers
> `__pycache__/` **et** tout `.netlify/functions-serve/` sont suivis par git alors qu'ils
> sont déjà couverts par `.gitignore` (`__pycache__/`, `*.py[cod]`, `.netlify`). Ce sont des
> artefacts générés (même classe que le `.db`) ; un `.pyc` stale contenait même l'ancienne
> chaîne `change-me-in-production`. Détracker (sans supprimer le local) est sûr et réversible.

**Files:** aucun fichier source modifié — uniquement l'index git.

- [ ] **Step 1 : Confirmer que ces chemins sont déjà ignorés**

Run : `git check-ignore backend/app/__pycache__/auth.cpython-313.pyc .netlify/functions-serve/api/netlify/functions/api.mjs`
Expected : les deux chemins sont retournés (donc déjà couverts par `.gitignore` — aucun ajout de règle nécessaire).

- [ ] **Step 2 : Détracker tous les `__pycache__` suivis (l'index seulement)**

```bash
git rm -r --cached --quiet $(git ls-files "*__pycache__*")
```
(Variante portable si la substitution échoue sous PowerShell : `git ls-files "*__pycache__*" > files.txt` puis `git rm -r --cached --quiet --pathspec-from-file=files.txt` puis supprimer `files.txt`.)

- [ ] **Step 3 : Détracker `.netlify/` (l'index seulement)**

```bash
git rm -r --cached --quiet .netlify
```

- [ ] **Step 4 : Vérifier**

Run : `git ls-files "*.pyc" | wc -l` → `0`.
Run : `git ls-files ".netlify/*" | wc -l` → `0`.
Run : `git status --short` → uniquement des `D` (deletions de l'index) ; les fichiers existent
toujours sur disque (`ls backend/app/__pycache__` non vide).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "chore: detrack les artefacts generes (__pycache__, .netlify) deja gitignores" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 : Validation finale du chantier

**Files:** aucun (vérification globale).

- [ ] **Step 1 : Build complet propre**

Run : `npx grunt build`
Expected : succès ; `dist/styles/main.min.css` présent ; `dist/index.html` et autres
`dist/**/index.html` régénérés.

- [ ] **Step 2 : Suite de tests verte**

Run : `pytest`
Expected : ~246 PASS, 0 échec.

- [ ] **Step 3 : `npm run build` (alias) produit aussi un dist complet**

Run : `npm run build`
Expected : succès ; `dist/styles/main.min.css` présent.

- [ ] **Step 4 : Smoke serveur de dev Python**

Run : `python scripts/dev_server.py --help`
Expected : aide affichée, pas d'erreur d'import.

- [ ] **Step 5 : Revue manuelle sécurité (optionnel mais recommandé)**

Vérifier par lecture que `api.mjs` et `backend/app/auth.py` ne contiennent plus de chaîne
`"admin"` ni `"change-me-in-production"` comme valeur par défaut, et que les routes
`/api/admin/*` renvoient 500 si les variables sont absentes (les routes publiques restent 200).

- [ ] **Step 6 : Récapitulatif des commits**

Run : `git log --oneline chantier/fondation-nettoyage`
Expected : un commit spec + 7 commits de tâches, tous atomiques.

---

## Self-review (couverture du spec)

- [x] §5.1 api.mjs sécurité → Task 2
- [x] §5.2 backend auth sécurité → Task 3
- [x] §5.3 npm run build → Task 1
- [x] §5.4 courses.yaml + AGENTS.md → Task 4
- [x] §5.5 12 scripts legacy → Task 5
- [x] §5.6 cours.html → Task 6
- [x] §5.7 atelier_cours.db → Task 7
- [x] §7 validation → Task 8

Tous les éléments du périmètre du spec sont couverts. Hors-périmètre (dual backend, double
inscription, SEO, tokens SCSS, CORS, docs IDOINE, exit-code build) volontairement non traités.
