# IDOINE - Générateur de Site Statique

IDOINE est un générateur de site statique et de blog puissant et modulable, conçu pour offrir une flexibilité maximale grâce à son architecture basée sur Python et Grunt. Il intègre un support multilingue natif, une gestion de contenu via Markdown et un pipeline de build moderne pour optimiser les performances.

[![Node Version](https://img.shields.io/badge/node-18%2B-brightgreen.svg)]()
[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

## ✨ Fonctionnalités

- **Multilingue :** Support natif pour la gestion de contenu en plusieurs langues.
- **Moteur de templates :** Utilise Jinja2 pour des templates flexibles et puissants.
- **Contenu en Markdown :** Rédigez vos pages et articles en Markdown avec support du Front Matter.
- **Pipeline de build automatisé :** Tâches Grunt pour la compilation SASS, l'optimisation des assets et le rechargement à chaud.
- **Extensible :** L'architecture basée sur des scripts Python permet d'ajouter facilement de nouvelles fonctionnalités (galeries, glossaires, etc.).
- **Optimisation pour la production :** Minification des CSS et des images pour des performances optimales.
- **Déploiement facile :** Pré-configuré pour un déploiement simple et rapide sur Netlify.

## 📋 Table des matières

1. [Prérequis](#-prérequis)
2. [Installation](#-installation)
3. [Utilisation](#-utilisation)
4. [Structure du projet](#-structure-du-projet)
5. [Pipeline de build](#-pipeline-de-build)
6. [Configuration](#-configuration)
7. [Déploiement](#-déploiement)
8. [Contribution](#-contribution)

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
    # Sur Windows (Git Bash ou CMD)
    .\venv\Scripts\activate ou . venv/Scripts/activate
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
npm run dev
```

Cette commande va :
- Lancer les scripts de build Python.
- Compiler les fichiers SASS.
- Démarrer un serveur web sur `http://localhost:9000`.
- Surveiller les modifications de vos fichiers et rafraîchir le navigateur automatiquement.

### Générer pour la production

Pour créer une version optimisée du site, prête à être déployée :

```bash
npm run build
```

Cette commande va :
- Nettoyer le répertoire `dist`.
- Exécuter les scripts de build Python pour générer tout le contenu HTML.
- Compiler, préfixer et minifier les fichiers SASS en un seul fichier CSS.
- Copier tous les assets (images, polices) dans le répertoire `dist`.

## 📁 Structure du projet

Le projet est organisé de manière à séparer clairement le contenu, les templates, les styles et les scripts.

```
idoine/
├── dist/                # Fichiers du site généré, prêts pour le déploiement.
├── node_modules/        # Dépendances Node.js.
├── scripts/             # Scripts Python pour la logique de build.
│   ├── build.py         # Script principal de construction.
│   └── ...              # Autres modules (gestionnaire de pages, posts, etc.).
├── src/
│   ├── assets/          # Fichiers statiques (images, polices, etc.).
│   ├── config/          # Fichiers de configuration globaux.
│   ├── data/            # Données structurées (ex: projets, traductions).
│   ├── locales/         # Contenu source multilingue (Markdown).
│   │   ├── en/
│   │   └── fr/
│   ├── scripts/         # Fichiers JavaScript pour le front-end.
│   └── styles/          # Fichiers SASS.
├── templates/           # Templates Jinja2 pour la génération des pages.
│   ├── base.html        # Template de base.
│   ├── components/      # Composants réutilisables (header, footer, etc.).
│   └── pages/           # Templates spécifiques à chaque type de page.
├── venv/                # Environnement virtuel Python.
├── .gitignore           # Fichiers et dossiers ignorés par Git.
├── Gruntfile.js         # Fichier de configuration des tâches Grunt.
├── netlify.toml         # Fichier de configuration pour le déploiement sur Netlify.
├── package.json         # Manifeste du projet Node.js et dépendances.
└── requirements.txt     # Dépendances Python.
```

## 🔄 Pipeline de build

Le processus de build est orchestré par Grunt, qui fait appel à des scripts Python pour la génération de contenu.

1.  **Nettoyage :** La tâche `clean` supprime le contenu du dossier `dist` pour assurer une build propre.
2.  **Build Python (`shell:build_html`) :** Le script `scripts/build.py` est exécuté. Il lit les fichiers Markdown, les données YAML, et utilise les templates Jinja2 pour générer toutes les pages HTML.
3.  **Compilation SASS (`sass`) :** Les fichiers `.scss` du dossier `src/styles` sont compilés en un unique fichier CSS dans `dist/styles`.
4.  **Post-traitement CSS (`postcss`) :** Autoprefixer est utilisé pour ajouter les préfixes vendeurs nécessaires à une meilleure compatibilité entre les navigateurs.
5.  **Minification CSS (`cssmin`) :** En mode production, le fichier CSS est minifié pour réduire son poids.
6.  **Copie des assets (`copy`) :** Les polices, images et autres fichiers statiques sont copiés du dossier `src/assets` vers `dist/assets`.
7.  **Serveur et surveillance (`connect`, `watch`) :** En mode développement, un serveur local est lancé et les fichiers sources sont surveillés. Toute modification déclenche les tâches appropriées et recharge le navigateur.

## ⚙️ Configuration

### `Gruntfile.js`
Ce fichier est le cœur de l'automatisation. Il définit les tâches pour le développement (`dev`) et la production (`build`). Vous pouvez y personnaliser les plugins Grunt ou ajouter de nouvelles tâches.

### `scripts/build.py`
Le script principal de la logique de génération. Il orchestre la création des pages, des articles de blog, du glossaire, etc.

### `src/config/site_config.yaml`
Fichier de configuration principal du site. Vous pouvez y définir le nom du site, les langues supportées, les menus de navigation et d'autres paramètres globaux.

## 🌐 Déploiement

Le projet est prêt à être déployé sur Netlify. Le fichier `netlify.toml` à la racine contient la configuration de build nécessaire.

```toml
[build]
  # Commande à exécuter pour construire le site
  command = "npm install && pip install -r requirements.txt && npm run build"
  # Dossier à publier
  publish = "dist"

[build.environment]
  # Spécifier les versions pour l'environnement de build de Netlify
  NODE_VERSION = "18"
  PYTHON_VERSION = "3.9"
```

Pour déployer :
1.  Créez un nouveau site sur Netlify à partir de votre dépôt Git.
2.  Netlify détectera automatiquement le fichier `netlify.toml` et utilisera les commandes spécifiées pour construire et déployer votre site.

## 👥 Contribution

Les contributions sont les bienvenues !

1.  Fork le projet.
2.  Créez une nouvelle branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`).
3.  Commitez vos changements (`git commit -m 'Add some AmazingFeature'`).
4.  Poussez votre branche (`git push origin feature/AmazingFeature`).
5.  Ouvrez une Pull Request.

### Guide de style

-   Essayez de respecter le style de code existant.
-   Documentez les nouvelles fonctionnalités ou les changements importants.
-   Assurez-vous que la documentation (ce `README.md`) est à jour si vos changements l'impactent.