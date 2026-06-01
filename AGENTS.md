# AGENTS.md — Atelier St-Elme

Contexte projet pour assistants de code (Claude Code, Cursor, etc.). Compléter avec `README.md`, `docs/GUIDE_BD.md` et `netlify.toml` (commentaires).

## Aperçu

Site statique **Atelier St-Elme** (céramique, vitrail, mosaïque) : contenu en Markdown + Jinja2, build Python (IDOINE), assets SCSS/Grunt, hébergement **Netlify** avec fonctions Node (`/api/*`) et base **Neon** (Postgres).

**Stack :** Node ≥ 18, Python ≥ 3.9, Grunt, FastAPI optionnel dans `backend/` pour dev local, Netlify Functions pour la prod.

## Architecture

```
src/
  locales/fr/pages/    # Pages Markdown (home, cours, inscription…)
  templates/             # Jinja2 (base, components, pages)
  styles/                # SCSS → dist/styles
  scripts/               # JS copiés vers dist/scripts (IIFE + main.js module)
  config/site_config.yaml
  data/                  # translations.yaml, courses.yaml…
scripts/core/build.py    # Génération HTML
netlify/functions/       # api.mjs, submission-created.js, etc.
backend/                 # API FastAPI + SQLite/Postgres (hors Netlify)
```

**Flux données cours :** le front appelle `GET /api/cours` (URL depuis `ATELIER_API_URL` au build ou même origine). En prod Netlify, `DATABASE_URL` alimente la function `api`.

## Conventions

- **Langue :** contenu et commentaires orientés site en **français** ; le reste peut suivre les fichiers existants.
- **Front :** HTML sémantique, un seul `<main id="main-content">` (défini dans `base.html`) — ne pas imbriquer un second `<main>` dans les pages.
- **JS :** pas de framework ; scripts page en IIFE ; `main.js` en ES module. Préserver l’ordre des scripts inscription (`coursLibelle.js` → `inscriptionParticipants.js` → `formPrefill.js` / `courseDetailForm.js`).
- **Python :** `pathlib`, types sur les signatures ; éviter les refactors hors périmètre.

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `scripts/core/build.py` | Build HTML |
| `Gruntfile.js` | Sass, PostCSS, copie assets/scripts |
| `netlify.toml` | Build Netlify, redirects `/api/*`, variables env documentées |
| `netlify/functions/api.mjs` | API cours / inscriptions / admin (Neon) |
| `src/config/site_config.yaml` | Métadonnées site |
| `docs/GUIDE_BD.md` | Backend, Neon, variables |
| `justfile` | Raccourcis (`just dev`, `just dev-fix-netlify-deno`) |

## Développement

```bash
npm install
pip install -r requirements.txt
npm run build              # ou npx grunt build + build Python
npm run dev                # Grunt + connect + watch (serveur stylé : CSS+JS) — recommandé
npm run dev:py             # HTML seul (Python) — REQUIERT `grunt watchOnly` à côté pour le CSS/JS
```

> **`npm run dev:py` seul = site sans style.** `build.py` régénère le HTML mais ne compile pas le SCSS ni ne copie les JS (rôle de Grunt). Pour un site stylé : `npm run dev` (port 9000) ; sinon lancer `grunt watchOnly` en parallèle. `build.py` préserve désormais `dist/styles` et `dist/scripts` afin de ne pas écraser le build frontend (sinon `dev:py` effacerait le CSS/JS produits par Grunt → 404).

**Netlify + API locale :** `just dev` ou `npx netlify dev` (voir section Problèmes). Alternative : `npm run dev:functions` sur un port + `ATELIER_API_URL` pointant vers cette URL.

**Tests :** `pytest` (racine, voir `pytest.ini`).

## Tâches fréquentes

**Ajouter une page statique :** Markdown dans `src/locales/fr/pages/`, template dans `src/templates/pages/` si besoin, rebuild.

**Modifier les cours affichés :** données en base (Neon) ou scripts seed/migrations dans `backend/` ; la liste sur `/cours` vient de l’API.

**Variables d’environnement :** `.env.example` à la racine ; `DATABASE_URL` sur Netlify pour les functions.

## Contraintes et pièges

- Ne pas committer `.env`, bases SQLite locales si politique d’équipe les exclut.
- **OneDrive / chemins longs (Windows)** : peuvent aggraver les erreurs de verrouillage de fichiers (voir ci-dessous).
- Les diffs sous `.netlify/` sont générés par le CLI ; ne pas traiter comme source de vérité du code métier.

## Netlify CLI / Deno (Windows)

Le CLI tente d’exécuter **Deno** pour l’environnement Edge même si ce projet n’utilise que des **fonctions Node**. Message complet typique : `Error: Failed to set up Deno for Edge Functions` puis `Command failed with EBUSY: …\deno-cli\deno.exe --version` / `spawn EBUSY`. **EBUSY** signifie que Windows refuse d’exécuter le fichier tout de suite (fichier encore verrouillé après écriture) — cause fréquente : **antivirus**, **OneDrive** sur le profil, ou **indexation** sur `%APPDATA%\netlify\Config\deno-cli\`.

- Toujours lancer le dev Netlify depuis la **racine du dépôt** : `just dev` et `npm run dev:netlify` passent par `scripts/run-netlify-dev-from-root.js` pour fixer le répertoire de travail (évite `just dev` lancé depuis `backend/`).
- **Cause racine EBUSY (Windows)** : sans `version.txt` dans le cache Deno du CLI, Netlify **retélécharge** `deno.exe` à chaque fois ; juste après l’extraction, `deno --version` peut échouer (EBUSY) → pas de `version.txt` → boucle. `run-netlify-dev-from-root.js` appelle `ensure-netlify-deno-version-file.js` avant le CLI pour créer `version.txt` lorsque le binaire est déjà là. Manuellement : `npm run ensure-netlify-deno-version` ou `just dev-fix-netlify-deno-version`.

1. `npm run reset-netlify-deno` ou `just dev-fix-netlify-deno` — le script supprime **`~/.config/netlify/deno-cli`** et, sous **Windows**, **`%APPDATA%\netlify\Config\deno-cli`** (chemin affiché dans l’erreur).
2. Si EBUSY persiste : fermer les terminaux, tuer les `deno.exe` (Gestionnaire des tâches), réessayer ; exclure **`%APPDATA%\netlify`** ou le dossier du projet du scan temps réel antivirus ; éviter la sync OneDrive sur ce cache si possible.
3. Installer Deno sur le PATH : `winget install Deno.Land` (voir https://ntl.fyi/install-deno) — peut aider selon la version du CLI.
4. Contournement : `npm run dev` (Grunt) + `npm run dev:functions` sans `netlify dev` (voir commentaires dans `netlify.toml`).

## Lignes directrices pour l’IA

- Lire le code adjacent avant de modifier ; garder les changements **ciblés** sur la demande.
- Ne pas réintroduire de `<main>` imbriqués dans les templates qui étendent `base.html`.
- Après changement SCSS ou scripts, le build passe par Grunt ; après Markdown/templates, par `scripts/core/build.py`.
