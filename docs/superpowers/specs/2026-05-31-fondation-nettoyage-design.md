# Design — Chantier « Fondation + nettoyages sûrs »

- **Date** : 2026-05-31
- **Dépôt** : Atelier St-Elme (site statique Markdown + Jinja2 + Python, Grunt/SCSS, Netlify + Neon)
- **Branche** : `atelierstelme`
- **Statut** : approuvé (design), en attente de revue du spec avant plan d'implémentation
- **Chantier** : 1er des trois (les suivants : Design visuel ; Cours & inscription)

## 1. Contexte

Une analyse multi-sous-systèmes a révélé que le générateur générique « IDOINE » a été
spécialisé pour l'atelier sans nettoyer l'ancien code. Trois pièges « fondation » ont été
**vérifiés dans le code** et conditionnent les chantiers suivants ; on y ajoute des nettoyages
sûrs et bon marché qui réduisent le risque de « modifier le mauvais fichier ».

Constats vérifiés :

| Constat | Preuve | Effet prod |
|---|---|---|
| Fallbacks d'auth faibles | `netlify/functions/api.mjs:18-19` ; `backend/app/auth.py:8,11` | Aucun *si* les variables d'env sont définies (elles le sont en prod) |
| `npm run build` cassé | `package.json:14` lance `sass:prod` **avant** `build.py`, or `scripts/core/static_file_manager.py:44-46` fait `rmtree(dist)` au début de `build.py` | Aucun (la prod utilise `npx grunt build`, cf. `netlify.toml:5`) |
| `src/data/courses.yaml` mort | Référencé uniquement dans `AGENTS.md` ; `scripts/core/context.py` ne charge que `translations` + `projects` | Aucun |

## 2. Objectif

Éliminer les pièges qui font perdre du temps ou créent un risque silencieux, **sans changer
le comportement observable de la production**. Chaque changement est soit invisible pour le
visiteur, soit purement interne (build/dev/dépôt).

## 3. Périmètre

### Inclus
1. Retrait des fallbacks d'auth dangereux + garde fail-closed (`api.mjs` **et** `backend/app/auth.py`).
2. Correction du piège `npm run build` (alias vers `grunt build`).
3. Source de vérité des cours : suppression de `courses.yaml` + mise à jour de la doc.
4. Suppression des 12 scripts Python legacy morts (hors `dev_server.py`, vivant).
5. Archivage de `cours.html` (export WordPress) hors de la racine.
6. Sortie de `atelier_cours.db` du suivi git + `.gitignore`.
7. Validation (build + pytest + smoke dev).

### Exclus (chantiers ultérieurs — ne PAS toucher ici)
- Consolidation des deux backends (FastAPI vs `api.mjs`).
- Double chemin d'inscription (`POST /api/inscriptions` + `submission-created.js`) et capacité non atomique.
- SEO meta/Open Graph non émis (blocs Jinja non déclarés dans `base.html`).
- ~70 tokens SCSS fantômes ; dark mode mort.
- CORS permissif (`origin.includes("atelierstelme")`).
- Docs IDOINE périmées (README/GETTING_STARTED/THEMING).
- `build.py` qui renvoie exit 0 même en échec.

## 4. Décisions arrêtées

- **Sécurité** : variables d'env déjà définies en prod → pas de hash/rate-limit obligatoire ; on retire
  seulement les défauts et on échoue proprement (fail-closed) si absentes. Le durcissement
  `backend/app/auth.py` est inclus **par cohérence** (dev-only).
- **`cours.html`** : **archivé** dans `docs/reference/ancien-site-cours.html` (référence de migration de contenu).
- **Code mort** : **suppression franche** (l'historique git est le filet de récupération).
- **JSON seed** (`horaire-printemps-2026.json`, `intensifs.json`) : **laissés en place** (lus par
  `backend/seed_courses.py`), documentés comme seed historique. Autorité = admin web → Neon.

## 5. Spécification détaillée

### 5.1 Sécurité — `netlify/functions/api.mjs`
**Avant** (l. 18-19) :
```js
const SECRET_KEY = process.env.SECRET_KEY || "change-me-in-production";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
```
**Après** :
```js
const SECRET_KEY = process.env.SECRET_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
```
Garde fail-closed, **uniquement sur les routes admin** (les routes publiques `/api/cours`,
`/api/inscriptions` doivent continuer à fonctionner même si l'auth est mal configurée) :
- Dans le handler `POST /api/admin/login` (l. ~265) **et** au début du bloc `if (pathname.startsWith("/api/admin/"))` (l. ~279), ajouter :
  ```js
  if (!SECRET_KEY || !ADMIN_PASSWORD) {
    return errorResponse("Authentification non configurée", 500, req);
  }
  ```
**Comportement prod** : inchangé (variables présentes). **Régression supprimée** : plus d'admin
ouvert avec mot de passe `admin` si une variable disparaît.

### 5.2 Sécurité — `backend/app/auth.py` (dev-only, cohérence)
**Avant** (l. 8, 11) :
```python
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
```
**Après** :
```python
SECRET_KEY = os.getenv("SECRET_KEY")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
```
- Au point de comparaison du mot de passe — `backend/app/routers/admin_api.py:25-29`
  (`@router.post("/login")`, `if body.password != ADMIN_PASSWORD`) — et dans
  `create_access_token`/`decode_token` (`auth.py`), échouer en `500
  "Authentification non configurée"` si `SECRET_KEY`/`ADMIN_PASSWORD` est `None`.
- Vérifier/compléter `backend/.env.example` pour documenter `SECRET_KEY` et `ADMIN_PASSWORD`
  comme **requis** en dev (le `backend/.env` local doit les définir).

### 5.3 `npm run build` — `package.json`
**Avant** (l. 14) :
```json
"build": "grunt sass:prod && python scripts/core/build.py --build",
```
**Après** :
```json
"build": "grunt build",
```
`grunt build` (Gruntfile l. 216-224) exécute `shell:build_html` (→ `build.py`, vide `dist/`)
**puis** `clean:styles → mkdir:styles → sass:prod → postcss:prod → cssmin:prod → copy`.
Ordre correct ; `npm run build` devient enfin conforme à ce que documente `CLAUDE.md`.

### 5.4 Source de vérité des cours
- **Supprimer** `src/data/courses.yaml` (mort, prix périmés, jamais chargé).
- **`AGENTS.md`** :
  - Arborescence `src/data/` : retirer la mention `courses.yaml` (laisser `translations.yaml`, `projects.yaml`).
  - Section « Modifier les cours affichés » : remplacer par — *l'autorité des cours est
    l'admin web (écrit dans Neon) ; `horaire-printemps-2026.json` + `intensifs.json` sont un
    seed initial historique consommé par `backend/seed_courses.py`. Ne pas éditer de YAML pour
    les cours.*
- **`CLAUDE.md`** : aucune correction requise pour `courses.yaml` (non mentionné) ; la table des
  commandes reste valide après 5.3.
- **JSON seed** : laissés en place. *(Option non retenue : déplacement vers `backend/seed_data/` —
  écartée pour ne pas toucher `seed_courses.py`.)*

### 5.5 Suppression des 12 scripts legacy
**Supprimer** (tous à la racine de `scripts/`) :
```
build.py  config_loader.py  frontmatter_parser.py  gallery_builder.py
gallery_utils.py  glossary_builder.py  metadata.py  page_builder.py
post_builder.py  server.py  static_file_manager.py  utils.py
```
**Conserver** : `scripts/dev_server.py` (vivant — `npm run dev:py`, importe `from utils.logger`),
ainsi que les helpers JS (`optimize-images.js`, `run-netlify-dev-from-root.js`,
`ensure-netlify-deno-version-file.js`, `reset-netlify-deno-cache.js`) et `scripts/audit.sh`.
Conserver les packages `scripts/core/`, `scripts/builders/`, `scripts/utils/` (les vrais modules).

**Garde-fou (dans le plan, AVANT suppression)** :
1. `grep` de non-référence (entrées, tests, docs, justfile) — déjà vérifié vide.
2. `pytest` vert après suppression (les tests importent `from core.X` / `from utils.X`).
3. Nettoyer les `__pycache__` orphelins correspondants si présents.

### 5.6 `cours.html`
- `git mv cours.html docs/reference/ancien-site-cours.html` (créer `docs/reference/` si absent).
- Ajouter `docs/reference/README.md` (1 ligne) : *« Export WordPress/Yoast de l'ancien site
  atelierstelme.ca, conservé comme référence de contenu. Non utilisé par le build. »*

### 5.7 `atelier_cours.db` — suivi git
- Ajouter au `.gitignore` :
  ```
  atelier_cours.db
  backend/atelier_cours.db
  *.db
  ```
- `git rm --cached atelier_cours.db backend/atelier_cours.db` (retire du suivi, **garde le fichier local**).
- Vérifier que rien dans le code ne dépend du `.db` racine comme ressource versionnée
  (le dev SQLite est régénéré par seed/migrations).

## 6. Ordre d'exécution recommandé

1. **5.3** `npm run build` (1 ligne, sans risque) — permet de fiabiliser les builds de validation.
2. **5.1 / 5.2** Sécurité (api.mjs + auth.py + .env.example).
3. **5.4** Suppression `courses.yaml` + doc `AGENTS.md`.
4. **5.5** Suppression des 12 legacy → `pytest`.
5. **5.6** Archivage `cours.html`.
6. **5.7** `.gitignore` + `git rm --cached` du `.db`.
7. **7 (validation)** : `npx grunt build` + `pytest` + smoke `npm run dev:py`.

## 7. Plan de validation

- `npx grunt build` → présence de `dist/styles/main.min.css` et régénération de `dist/**/index.html`.
- `pytest` → ~246 tests verts (confirme que la suppression des legacy n'a rien cassé).
- `npm run build` → produit désormais un `dist/` complet (CSS + JS + HTML).
- Smoke : `npm run dev:py` démarre (valide `dev_server.py` après suppression des legacy).
- Sécurité (revue manuelle) : avec `SECRET_KEY`/`ADMIN_PASSWORD` absents en local, `/api/admin/login`
  répond `500` et `/api/cours` répond `200`.

## 8. Risques & rollback

| Risque | Probabilité | Mitigation |
|---|---|---|
| Un test importe en réalité un fichier legacy | Très faible (imports vérifiés via packages) | `pytest` AVANT commit ; `git revert` sinon |
| Le `.db` racine servait de ressource versionnée | Faible | `git rm --cached` garde le fichier local ; ne pas `rm` |
| `seed_courses.py` dépend de `courses.yaml` | Nulle (lit les JSON) | Vérifié ; aucun import YAML cours |
| Fail-closed casse l'admin en prod | Nulle (variables définies) | Garde limitée aux routes `/api/admin/*` |

Filet général : l'historique git conserve tout fichier supprimé ; chaque étape est un commit atomique réversible.

## 9. Critères de succès

- [ ] `npm run build` produit un `dist/` complet (CSS minifié + scripts + HTML).
- [ ] Plus aucun fallback `"admin"` / `"change-me-in-production"` dans `api.mjs` ni `auth.py`.
- [ ] Routes admin fail-closed si variables absentes ; routes publiques intactes.
- [ ] `src/data/courses.yaml` supprimé ; `AGENTS.md` à jour sur la source des cours.
- [ ] Les 12 scripts legacy supprimés ; `dev_server.py` conservé ; `pytest` vert.
- [ ] `cours.html` archivé dans `docs/reference/` ; racine nettoyée.
- [ ] `atelier_cours.db` hors suivi git ; `.gitignore` à jour.
- [ ] Comportement prod inchangé pour le visiteur.
