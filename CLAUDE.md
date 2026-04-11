# CLAUDE.md — Atelier St-Elme

Instructions pour **Claude** (et outils compatibles) travaillant sur ce dépôt. Document détaillé : **`AGENTS.md`**.

## En bref

- **Quoi :** site statique (Markdown + Jinja2 + SCSS), généré par Python (`scripts/core/build.py`) et Grunt ; déployé sur **Netlify** avec fonctions Node (`netlify/functions/api.mjs`) et **Neon** (`DATABASE_URL`).
- **Où :** contenu FR dans `src/locales/fr/` ; gabarits `src/templates/` ; styles `src/styles/` ; JS `src/scripts/`.
- **Backend optionnel :** dossier `backend/` (FastAPI) pour dev local ; prod cours/inscriptions souvent via la function Netlify.

## Commandes utiles

| Objectif | Commande |
|----------|----------|
| Build complet | `npm run build` |
| Dev (Grunt + serveur) | `npm run dev` |
| Dev sans Netlify | `npm run dev:py` |
| Netlify Dev (site + functions) | `just dev` ou `npm run dev:netlify` (cwd racine forcée) |
| Tests | `pytest` |

## Problème : Netlify CLI « Failed to set up Deno » / `spawn EBUSY` (Windows)

Le CLI Netlify lance Deno pour l’infra Edge ; ce repo n’en a pas besoin pour les functions Node. Erreur complète typique : `Failed to set up Deno for Edge Functions` + `Command failed with EBUSY: …\deno-cli\deno.exe --version` + `spawn EBUSY` (fichier exécutable verrouillé juste après téléchargement — antivirus, **OneDrive** sur `%APPDATA%`, indexation).

**À faire :**

1. Lancer depuis la racine : `just dev` / `npm run dev:netlify` (script `run-netlify-dev-from-root.js`).
2. `npm run reset-netlify-deno` ou `just dev-fix-netlify-deno` — efface `~/.config/netlify/deno-cli` et `%APPDATA%\netlify\Config\deno-cli`.
3. Si **EBUSY** continue : fermer les terminaux, tuer `deno.exe`, exclure le cache Netlify de l’antivirus ; éventuellement `winget install Deno.Land`.

**Plan B :** ne pas utiliser `netlify dev` — `npm run dev` + `npm run dev:functions` et `ATELIER_API_URL` vers le port des functions (voir `netlify.toml`).

## Règles de contribution (IA)

- Préserver **`AGENTS.md`** pour l’architecture ; mettre à jour ce fichier ou `CLAUDE.md` si tu introduis un flux de dev majeur.
- Un seul **`<main id="main-content">`** : défini dans `src/templates/base.html` — pas de second `<main>` dans `{% block content %}`.
- Scripts inscription : respecter l’ordre de chargement documenté dans `AGENTS.md`.
- Éviter les refactors hors demande ; commentaires et copy de site en **français** lorsque c’est le contexte du fichier.
