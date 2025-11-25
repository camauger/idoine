# IDOINE - Générateur de Site Statique & Constructeur de Thèmes

IDOINE est un générateur de site statique et un **constructeur de thèmes** puissant et modulable, conçu pour offrir une flexibilité maximale grâce à son architecture basée sur Python et Grunt. Il intègre un support multilingue natif, une gestion de contenu via Markdown, un système de thèmes personnalisables et un pipeline de build moderne pour optimiser les performances.

[![Node Version](https://img.shields.io/badge/node-18%2B-brightgreen.svg)]()
[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

## ✨ Fonctionnalités

- **Constructeur de thèmes :** Système de thèmes flexible basé sur les variables CSS avec support du mode sombre.
- **Multilingue :** Support natif pour la gestion de contenu en plusieurs langues avec sélecteur de langue intégré.
- **Moteur de templates :** Utilise Jinja2 pour des templates flexibles et puissants.
- **Contenu en Markdown :** Rédigez vos pages et articles en Markdown avec support du Front Matter YAML.
- **Pipeline de build automatisé :** Tâches Grunt pour la compilation SASS, l'optimisation des assets et le rechargement à chaud.
- **Galerie d'images :** Génération automatique de galeries avec images responsives (WebP, multiples tailles).
- **Glossaire :** Support intégré pour la création de glossaires avec tags.
- **Optimisation d'images :** Génération automatique de variantes responsives avec Pillow.
- **Validation de données :** Schémas Pydantic pour valider les configurations et métadonnées.
- **Polices auto-hébergées :** Support pour Montserrat, Cinzel Decorative et Font Awesome.
- **Serveur de développement Python :** Alternative au serveur Grunt avec hot reload natif.
- **Déploiement facile :** Pré-configuré pour un déploiement simple et rapide sur Netlify.

## 📋 Table des matières

1. [Prérequis](#-prérequis)
2. [Installation](#-installation)
3. [Utilisation](#-utilisation)
4. [Structure du projet](#-structure-du-projet)
5. [Pipeline de build](#-pipeline-de-build)
6. [Configuration](#-configuration)
7. [Thèmes](#-thèmes)
8. [Déploiement](#-déploiement)
9. [Tests](#-tests)
10. [Contribution](#-contribution)

## 🔧 Prérequis

Avant de commencer, assurez-vous d'avoir les outils suivants installés sur votre système :

- **Node.js :** Version 18 ou supérieure.
- **npm :** Généralement inclus avec Node.js.
- **Python :** Version 3.9 ou supérieure.
- **Grunt CLI :** L'interface de ligne de commande de Grunt. Installez-la globalement avec `npm install -g grunt-cli`.

## 💻 Installation

Suivez ces étapes pour mettre en place votre environnement de développement local.

1.  **Cloner le dépôt :**
    ```bash
    git clone [URL_DU_REPO]
    cd idoine
    ```

2.  **Installer les dépendances Node.js :**
    Ces dépendances sont nécessaires pour exécuter les tâches Grunt (compilation SASS, serveur de développement, etc.).
    ```bash
    npm install
    ```

3.  **Créer et activer un environnement virtuel Python :**
    Il est recommandé d'utiliser un environnement virtuel pour isoler les dépendances Python du projet.
    ```bash
    # Créer l'environnement
    python -m venv venv

    # Activer l'environnement
    # Sur Windows (Git Bash)
    source venv/Scripts/activate
    # Sur Windows (CMD/PowerShell)
    .\venv\Scripts\activate
    # Sur macOS/Linux
    source venv/bin/activate
    ```

4.  **Installer les dépendances Python :**
    Ces dépendances sont utilisées par les scripts de build pour générer les pages HTML à partir des fichiers Markdown.
    ```bash
    pip install -r requirements.txt
    ```

## 🚀 Utilisation

### Environnement de développement

Pour démarrer le serveur de développement local avec rechargement automatique (live reload) :

```bash
# Avec Grunt (serveur sur http://localhost:9000)
npm run dev

# Avec le serveur Python natif (serveur sur http://localhost:8000)
npm run dev:py
```

La commande `npm run dev` va :
- Lancer les scripts de build Python pour générer le HTML.
- Compiler les fichiers SASS.
- Appliquer PostCSS (Autoprefixer).
- Copier les assets (images, polices, scripts).
- Démarrer un serveur web sur `http://localhost:9000`.
- Surveiller les modifications et rafraîchir le navigateur automatiquement.

### Serveur de développement Python

Le serveur Python (`npm run dev:py`) offre une alternative légère avec :
- Hot reload sur les fichiers Markdown, templates et configuration.
- Injection automatique du script de live reload.
- Pas de dépendance à Node.js pour le développement.

```bash
# Options disponibles
python scripts/dev_server.py --help
python scripts/dev_server.py -p 3000      # Port personnalisé
python scripts/dev_server.py --no-reload  # Désactiver le hot reload
python scripts/dev_server.py -v           # Mode verbose
```

### Générer pour la production

Pour créer une version optimisée du site, prête à être déployée :

```bash
npm run build
```

Cette commande va :
- Compiler les fichiers SASS en mode production (compressé).
- Exécuter les scripts de build Python pour générer tout le contenu HTML.
- Appliquer PostCSS (Autoprefixer).
- Minifier le CSS.
- Copier tous les assets dans le répertoire `dist`.

## 📁 Structure du projet

Le projet est organisé de manière à séparer clairement le contenu, les templates, les styles et les scripts.

```
idoine/
├── dist/                    # Fichiers du site généré
├── docs/                    # Documentation technique
│   └── BUILD_ARCHITECTURE.md
├── scripts/                 # Scripts Python de build
│   ├── core/                # Modules principaux
│   │   ├── build.py         # Point d'entrée principal
│   │   ├── context.py       # BuildContext (injection de dépendances)
│   │   ├── config_loader.py # Chargement des configurations YAML
│   │   ├── config_schema.py # Schéma Pydantic pour site_config
│   │   ├── static_file_manager.py
│   │   ├── template_renderer.py
│   │   ├── url_router.py
│   │   └── ...
│   ├── builders/            # Générateurs de contenu
│   │   ├── page_builder.py  # Pages statiques
│   │   ├── post_builder.py  # Articles de blog
│   │   ├── glossary_builder.py
│   │   └── gallery_builder.py
│   ├── utils/               # Utilitaires
│   │   ├── constants.py     # Constantes centralisées
│   │   ├── frontmatter_parser.py
│   │   ├── image_processor.py
│   │   ├── file_cache.py
│   │   ├── path_validator.py
│   │   ├── exceptions.py
│   │   ├── logger.py
│   │   └── ...
│   └── dev_server.py        # Serveur de développement Python
├── src/
│   ├── assets/              # Fichiers statiques
│   │   ├── images/
│   │   ├── fonts/
│   │   └── gallery_images/  # Images de la galerie
│   ├── config/              # Configuration du site
│   │   └── site_config.yaml
│   ├── data/                # Données structurées
│   │   ├── translations.yaml
│   │   └── projects.yaml
│   ├── locales/             # Contenu multilingue (Markdown)
│   │   ├── en/
│   │   │   ├── pages/
│   │   │   └── posts/
│   │   └── fr/
│   │       ├── pages/
│   │       ├── posts/
│   │       └── glossaire/
│   ├── scripts/             # JavaScript front-end
│   │   ├── main.js
│   │   ├── languageSwitcher.js
│   │   ├── themeToggle.js
│   │   └── ...
│   ├── styles/              # Fichiers SASS
│   │   ├── main.scss
│   │   ├── base/
│   │   ├── components/
│   │   └── layout/
│   └── templates/           # Templates Jinja2
│       ├── base.html
│       ├── components/
│       ├── macros/
│       ├── pages/
│       └── posts/
├── tests/                   # Suite de tests
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── Gruntfile.js             # Configuration Grunt
├── package.json             # Dépendances Node.js
├── requirements.txt         # Dépendances Python
└── netlify.toml             # Configuration Netlify
```

## 🔄 Pipeline de build

Le processus de build est orchestré par Grunt, qui fait appel à des scripts Python pour la génération de contenu.

### Étapes du build

1.  **Build Python (`shell:build_html`) :**
    - Nettoie le dossier `dist`
    - Copie les fichiers statiques
    - Génère les pages HTML depuis les fichiers Markdown
    - Crée les pages de blog avec pagination
    - Génère le glossaire et les pages de tags
    - Crée les pages de catégories et mots-clés
    - Génère la galerie d'images avec variantes responsives

2.  **Compilation SASS (`sass`) :**
    Les fichiers `.scss` sont compilés en CSS.

3.  **Post-traitement CSS (`postcss`) :**
    Autoprefixer ajoute les préfixes vendeurs.

4.  **Minification CSS (`cssmin`) :**
    En production, le CSS est minifié.

5.  **Copie des assets (`copy`) :**
    Polices, images et scripts JavaScript sont copiés dans `dist`.

6.  **Serveur et surveillance (`connect`, `watch`) :**
    En développement, un serveur local est lancé avec live reload.

### Watchers configurés

- `src/styles/**/*.scss` → Recompilation SASS
- `src/assets/**/*` → Copie des assets
- `src/scripts/**/*.js` → Copie des scripts
- `src/locales/**/*.md` → Rebuild Python
- `src/templates/**/*.html` → Rebuild Python
- `src/config/**/*.yaml` → Rebuild Python

## ⚙️ Configuration

### `src/config/site_config.yaml`

Fichier de configuration principal du site :

```yaml
title: 'Mon Site'
description: 'Description du site'
author: 'Auteur'
base_url: 'https://example.com'

languages: ['fr', 'en']
default_lang: 'fr'
language_names:
  fr: 'Français'
  en: 'English'

blog_url: '/blog'
glossary_url: '/glossaire'
gallery_url: '/gallery'

posts_per_page: 5
terms_per_page: 10
```

### Variables d'environnement

- `IDOINE_USE_ICONS` - Active/désactive les emojis dans les logs (défaut: `true`)

### Front Matter des fichiers Markdown

```yaml
---
title: Titre de la page
description: Description pour le SEO
date: 2025-01-01
author: Auteur
slug: url-slug
translation_id: identifiant-traduction
categories: [cat1, cat2]
meta_keywords: [mot1, mot2]
tags: [tag1, tag2]
template: pages/custom.html
thumbnail: image.jpg
---
```

## 🎨 Thèmes

IDOINE est conçu comme un **constructeur de thèmes** avec un système de personnalisation flexible basé sur les variables CSS.

### Système de variables CSS

Toutes les valeurs du thème sont définies dans `src/styles/base/_variables.scss` :

```scss
:root {
  /* Couleurs */
  --color-primary: #2a9d8f;
  --color-secondary: #e76f51;
  --color-text: #333333;
  --color-background: #fafafa;

  /* Typographie */
  --font-primary: "Montserrat", sans-serif;
  --font-display: "Cinzel Decorative", serif;

  /* Espacement */
  --spacing-4: 1.6rem;
  --spacing-8: 3.2rem;

  /* Ombres et bordures */
  --border-radius: 0.4rem;
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
}
```

### Mode sombre

Le mode sombre est intégré via le sélecteur `[data-theme="dark"]` :

```scss
[data-theme="dark"] {
  --color-text: #e0e0e0;
  --color-background: #121212;
  --color-background-alt: #1e1e1e;
}
```

### Créer un thème personnalisé

1. Créez un fichier `src/styles/themes/_mon-theme.scss`
2. Définissez vos variables dans un sélecteur `[data-theme="mon-theme"]`
3. Importez le thème dans `main.scss`

```scss
[data-theme="mon-theme"] {
  --color-primary: #6366f1;
  --color-secondary: #f59e0b;
  --font-primary: "Inter", sans-serif;
}
```

### Documentation complète

Pour un guide détaillé sur la création de thèmes, consultez **[docs/THEMING.md](docs/THEMING.md)**.

## 🌐 Déploiement

Le projet est prêt à être déployé sur Netlify. Le fichier `netlify.toml` contient la configuration nécessaire :

```toml
[build]
  command = "npm install && pip install -r requirements.txt && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  PYTHON_VERSION = "3.9"
```

Pour déployer :
1. Créez un nouveau site sur Netlify à partir de votre dépôt Git.
2. Netlify détectera automatiquement le fichier `netlify.toml`.

## 🧪 Tests

Le projet inclut une suite de tests unitaires et d'intégration.

```bash
# Activer l'environnement virtuel
source venv/Scripts/activate  # Windows Git Bash
source venv/bin/activate      # macOS/Linux

# Exécuter tous les tests
python -m pytest tests/

# Tests avec couverture
python -m pytest tests/ --cov=scripts

# Tests spécifiques
python -m pytest tests/unit/test_frontmatter_parser.py -v
```

## 👥 Contribution

Les contributions sont les bienvenues !

1. Fork le projet.
2. Créez une nouvelle branche (`git checkout -b feature/AmazingFeature`).
3. Commitez vos changements (`git commit -m 'Add some AmazingFeature'`).
4. Poussez votre branche (`git push origin feature/AmazingFeature`).
5. Ouvrez une Pull Request.

### Guide de style

- **Python :** Suivre PEP 8, utiliser Black pour le formatage.
- **JavaScript :** Style ES6+.
- **SCSS :** BEM pour les noms de classes.
- **Documentation :** Docstrings Google-style pour Python.

### Linting

```bash
# Python
black scripts/
flake8 scripts/

# Audit de sécurité
npm run audit
pip-audit
```
