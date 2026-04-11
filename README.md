# IDOINE – Générateur de site statique

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Prérequis](#prérequis)
3. [Installation rapide](#installation-rapide)
4. [Commandes principales](#commandes-principales)
5. [Organisation du contenu](#organisation-du-contenu)
6. [Front matter & mise en page](#front-matter--mise-en-page)
7. [Personnalisation visuelle](#personnalisation-visuelle)
8. [Tests](#tests)
9. [Déploiement](#déploiement)

---

## Fonctionnalités

- **Markdown + Front matter** : pages, articles et glossaire stockés dans `src/locales/fr`, avec prise en charge des slugs personnalisés, des héros illustrés et des champs SEO.
- **Gabarits Jinja2** : composants `<header>`, héros, navigation et footer pensés pour idoine, avec surcharge possible.
- **Gestion d’images** : tous les visuels placés dans `src/assets/images` sont copiés vers `/assets/images` _et_ `/images` pour conserver les anciens liens.
- **Générateurs dédiés** : builders Python pour les articles, le glossaire, les pages statiques, les tags et la pagination.
- **Pipeline front-end** : SCSS modulaires, variables de thème et mode sombre natif.
- **Serveur de développement** : Grunt (`npm run dev`) ou serveur Python (`npm run dev:py`) avec injection auto du script de live reload.
- **Déploiement Netlify** : configuration prête à l’emploi (`netlify.toml`).

---

## Prérequis

- **Node.js** ≥ 18
- **npm**
- **Python** ≥ 3.9
- **Grunt CLI** (optionnel si vous utilisez uniquement le serveur Python) :

```bash
npm install -g grunt-cli
```

---

## Installation rapide

```bash
git clone <URL_DU_DEPOT>
cd idoine-idoine

# Dépendances Node (Grunt, PostCSS, etc.)
npm install

# Environnement virtuel Python (optionnel mais recommandé)
python -m venv venv
source venv/bin/activate      # macOS/Linux
# ou
source venv/Scripts/activate  # Windows Git Bash

# Dépendances Python
pip install -r requirements.txt
```

---

## Commandes principales

| Commande               | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm run dev`          | Build + watchers + serveur Grunt sur `http://localhost:9000`.              |
| `npm run dev:py`       | Serveur Python léger (`http://localhost:8000`), sans dépendre de Grunt.     |
| `npm run build`        | Build complet optimisé (SCSS minifié, HTML généré, assets copiés).          |
| `python scripts/dev_server.py -p 3000` | Lance le serveur Python sur un port personnalisé.          |

Les scripts Python peuvent également être exécutés directement (voir `scripts/core` et `scripts/build.py`).

---

## Organisation du contenu

```
src/
├── assets/
│   ├── images/              # Images du site (héros, vignettes, etc.)
│   ├── fonts/
│   └── gallery_images/      # Images générées pour la galerie responsive
├── config/
│   └── site_config.yaml     # Métadonnées globales (titre, URLs, footer…)
├── data/
│   ├── translations.yaml    # Libellés d’interface (FR uniquement par défaut)
│   └── projects.yaml        # Contenu structuré additionnel
├── locales/
│   └── fr/
│       ├── pages/           # Pages statiques (home, à propos, etc.)
│       ├── posts/           # Articles du blog (Markdown)
│       └── glossaire/       # Entrées du glossaire
├── styles/                  # SCSS (base, layout, composants…)
└── templates/
    ├── base.html
    ├── components/          # Header, hero, post-meta, etc.
    ├── pages/               # Templates de pages (home, blog, catégorie…)
    └── posts/               # Template générique d’article
```

Les nouveaux articles se placent dans `src/locales/fr/posts`. Les images peuvent être référencées via `/images/<fichier>` ou `/assets/images/<fichier>`.

---

## Front matter & mise en page

Chaque fichier Markdown commence par un bloc YAML. Voici un exemple complet pour un article :

```yaml
---
title: "Oui-Et ('Yes and') dans la céramique et le vitrail"
description: "Guide pratique pour la narration collaborative."
slug: oui-et
date: 2024-03-23
author: Christian Amauger
categories: ["Céramique", "Vitrail"]
meta_keywords: ["oui-et", "improvisation"]
tags: ["céramique", "vitrail"]
banner: /images/oui-et.png          # Image utilisée pour le hero des articles
hero_image: /images/oui-et.png      # Optionnel : surcharge de l’image principale
hero_description: "Découvrir la philosophie du Oui-Et."
hero_cta: "Explorer d'autres articles"
hero_cta_url: /articles
thumbnail: /images/oui-et.png       # Vignette utilisée dans les listes
---
Contenu en **Markdown**…
```

Champs notables :

- `banner` / `hero_image` : déclenchent l’affichage du hero visuel dans les articles (sinon fallback textuel).
- `hero_description`, `hero_cta`, `hero_cta_url` : pour personnaliser le texte et le bouton.
- `summary` (optionnel) : texte affiché dans les cartes d’aperçu. À défaut, `description` est utilisée.

La page d’accueil (`pages/home.md`) supporte les mêmes champs pour la section hero.

---

## Personnalisation visuelle

- **Variables globales** : `src/styles/base/_variables.scss`.
- **Hero** : `src/styles/pages/_hero.scss` gère le hero principal ainsi que la déclinaison `.post-hero`.
- **Méta d’article** : `src/styles/posts/_post.scss` contrôle l’entête des posts (flex, responsive).
- **Navigation & footer** : `src/templates/components/main-nav.html` et `footer.html` reposent sur `site_config.yaml` (liste des jeux, liens de ressources, contact).

Pour changer la palette ou la typographie, ajustez les variables CSS puis recompilez (`npm run dev` ou `npm run build`).

---

## Tests

```bash
source venv/bin/activate  # ou .\venv\Scripts\activate
python -m pytest tests
python -m pytest tests --cov=scripts   # couverture
```

Des tests unitaires et d’intégration valident le pipeline de build (`tests/integration/test_build_pipeline.py`).

---

## Déploiement

Le projet est configuré pour Netlify :

```toml
[build]
  command = "npm install && pip install -r requirements.txt && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  PYTHON_VERSION = "3.9"
```

1. Connectez le dépôt à Netlify.
2. Laissez la commande de build par défaut (ci-dessus).
3. Publiez. Netlify servira le contenu du dossier `dist/`.

Pour un hébergement alternatif (S3, GitHub Pages…), exécutez simplement `npm run build` et uploadez le répertoire `dist/`.

---

### Besoin d’aller plus loin ?

- Ajustez `src/config/site_config.yaml` pour mettre à jour les métadonnées (titre, base_url, footer).
- Ajoutez de nouveaux templates ou composants dans `src/templates/`.
- Étendez la logique des builders dans `scripts/builders/` si vous avez des types de contenu supplémentaires.

Bon build et… bons jeux ! 🎲
