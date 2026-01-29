# Guide de démarrage rapide

Ce guide vous accompagne dans la création de votre site web avec Idoine, de l'installation à la mise en ligne.

## Table des matières

1. [Installation rapide](#installation-rapide)
2. [Structure du projet](#structure-du-projet)
3. [Configurer votre site](#configurer-votre-site)
4. [Créer du contenu](#créer-du-contenu)
5. [Personnaliser le thème](#personnaliser-le-thème)
6. [Ajouter des images](#ajouter-des-images)
7. [Déployer votre site](#déployer-votre-site)
8. [Checklist avant la mise en ligne](#checklist-avant-la-mise-en-ligne)

---

## Installation rapide

### Prérequis

- **Node.js 18+** : [nodejs.org](https://nodejs.org/)
- **Python 3.9+** : [python.org](https://www.python.org/)
- **Git** : [git-scm.com](https://git-scm.com/)

### Étapes d'installation

```bash
# 1. Cloner le projet
git clone https://github.com/votre-username/idoine.git mon-site
cd mon-site

# 2. Lancer le script d'initialisation
./init.sh --minimal    # Pour partir de zéro
# ou
./init.sh --demo       # Pour explorer avec du contenu exemple

# 3. Lancer le serveur de développement
npm run dev

# 4. Ouvrir dans le navigateur
# http://localhost:9000
```

Le script `init.sh` :
- Vérifie les prérequis installés
- Installe les dépendances Node.js et Python
- Configure l'environnement virtuel Python
- Vous demande les informations de base de votre site
- Lance un premier build pour vérifier que tout fonctionne

---

## Structure du projet

Voici les dossiers principaux que vous allez utiliser :

```
mon-site/
├── src/
│   ├── config/
│   │   └── site_config.yaml    # Configuration du site
│   ├── locales/                 # Votre contenu
│   │   ├── fr/
│   │   │   ├── pages/          # Pages statiques
│   │   │   └── posts/          # Articles de blog
│   │   └── en/
│   │       ├── pages/
│   │       └── posts/
│   ├── assets/                  # Fichiers statiques
│   │   ├── images/             # Vos images
│   │   └── fonts/              # Polices personnalisées
│   ├── styles/                  # Feuilles de style SCSS
│   │   └── base/_variables.scss # Variables du thème
│   └── templates/               # Templates Jinja2
├── dist/                        # Site généré (ne pas modifier)
├── docs/                        # Documentation
└── starters/                    # Templates de contenu
```

---

## Configurer votre site

### Fichier de configuration principal

Ouvrez `src/config/site_config.yaml` et modifiez les valeurs :

```yaml
# Informations de base
title: 'Mon Portfolio'
tagline: 'Développeur créatif'
author: 'Marie Dupont'
base_url: 'https://mariedupont.com'

# Langues (retirez 'en' si vous ne voulez que le français)
languages: ['fr', 'en']
default_lang: 'fr'

# Réseaux sociaux
social_media:
  github:
    url: 'https://github.com/mariedupont'
    name: 'GitHub'
  linkedin:
    url: 'https://linkedin.com/in/mariedupont'
    name: 'LinkedIn'

# SEO
default_description: 'Portfolio de Marie Dupont, développeuse créative'
keywords: 'développeur, web, portfolio, créatif'
```

### Traductions de l'interface

Pour modifier les textes de l'interface (boutons, navigation, etc.), éditez `src/data/translations.yaml`.

---

## Créer du contenu

### Pages

Les pages sont des fichiers Markdown dans `src/locales/{langue}/pages/`.

**Exemple : Page d'accueil** (`src/locales/fr/pages/home.md`)

```yaml
---
title: Bienvenue
description: Page d'accueil de mon site
hero_cta: Découvrir mes projets
template: pages/home.html
hero_image: hero.jpg
translation_id: home
---
```

**Exemple : Page personnalisée** (`src/locales/fr/pages/services.md`)

```yaml
---
title: Mes Services
description: Les services que je propose
template: pages/page.html
translation_id: services
---

## Développement Web

Je crée des sites web modernes et performants.

## Design UI/UX

J'accompagne vos projets de la conception à la réalisation.
```

### Articles de blog

Les articles sont dans `src/locales/{langue}/posts/`.

**Exemple : Article** (`src/locales/fr/posts/mon-premier-article.md`)

```yaml
---
title: Mon premier article
date: 2025-01-29
author: Marie Dupont
slug: mon-premier-article
summary: Découvrez comment j'ai créé mon site avec Idoine
categories: [tutoriel, web]
tags: [débutant, idoine]
translation_id: first-article
---

## Introduction

Bienvenue sur mon blog ! Dans cet article, je partage mon expérience...

## Les étapes

1. J'ai cloné le projet
2. J'ai configuré mon site
3. J'ai personnalisé le thème

## Conclusion

Idoine est un excellent outil pour créer son site personnel.
```

### Front Matter (métadonnées)

Chaque fichier Markdown commence par un bloc YAML entre `---` :

| Propriété | Description | Requis |
|-----------|-------------|--------|
| `title` | Titre de la page | Oui |
| `description` | Description SEO | Recommandé |
| `template` | Template à utiliser | Non (défaut: page.html) |
| `translation_id` | ID pour lier les traductions | Oui si multilingue |
| `date` | Date de publication (posts) | Posts uniquement |
| `categories` | Catégories (posts) | Non |
| `tags` | Tags (posts) | Non |
| `slug` | URL personnalisée | Non |
| `thumbnail` | Image de vignette | Non |

---

## Personnaliser le thème

### Couleurs et typographie

Modifiez les variables CSS dans `src/styles/base/_variables.scss` :

```scss
:root {
  // Couleurs principales
  --color-primary: #2a9d8f;        // Couleur principale
  --color-secondary: #e76f51;      // Couleur d'accent

  // Texte
  --color-text: #333333;           // Texte principal
  --color-text-light: #666666;     // Texte secondaire

  // Arrière-plans
  --color-background: #fafafa;     // Fond principal
  --color-background-alt: #f5f5f5; // Fond alternatif

  // Polices
  --font-primary: "Montserrat", sans-serif;
  --font-display: "Cinzel Decorative", serif;
}
```

### Mode sombre

Le mode sombre est automatiquement supporté. Personnalisez-le avec :

```scss
[data-theme="dark"] {
  --color-text: #e0e0e0;
  --color-background: #121212;
  --color-background-alt: #1e1e1e;
}
```

### Polices personnalisées

1. Ajoutez vos fichiers `.woff2` dans `src/assets/fonts/ma-police/`
2. Déclarez la police dans `src/styles/base/_fonts.scss` :

```scss
@font-face {
  font-family: 'Ma Police';
  src: url('/assets/fonts/ma-police/ma-police-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

3. Utilisez-la dans `_variables.scss` :

```scss
:root {
  --font-primary: "Ma Police", sans-serif;
}
```

Pour plus de détails, consultez [docs/THEMING.md](THEMING.md).

---

## Ajouter des images

### Images du site

Placez vos images dans `src/assets/images/` :

```
src/assets/images/
├── hero.jpg          # Image de la bannière
├── about.jpg         # Photo pour la page À propos
├── logo.png          # Logo du site
└── projects/         # Dossier pour les projets
    ├── projet-1.jpg
    └── projet-2.jpg
```

### Images dans le contenu

Dans vos fichiers Markdown, référencez les images :

```markdown
![Description de l'image](/assets/images/projects/projet-1.jpg)
```

### Optimisation automatique

Idoine génère automatiquement des versions optimisées de vos images :
- Format WebP pour les navigateurs modernes
- Plusieurs tailles pour le responsive
- Compression optimisée

---

## Déployer votre site

### Option 1 : Netlify (recommandé)

1. Créez un compte sur [netlify.com](https://netlify.com)
2. Connectez votre dépôt GitHub
3. Netlify détecte automatiquement la configuration dans `netlify.toml`
4. Votre site est en ligne !

### Option 2 : Déploiement manuel

```bash
# Générer le site de production
npm run build

# Les fichiers sont dans dist/
# Uploadez-les sur votre hébergeur
```

### Option 3 : GitHub Pages

1. Dans `site_config.yaml`, définissez `base_url` avec votre URL GitHub Pages
2. Générez le site : `npm run build`
3. Poussez le dossier `dist/` vers la branche `gh-pages`

---

## Checklist avant la mise en ligne

### Contenu

- [ ] Toutes les pages ont un titre et une description
- [ ] Les liens internes fonctionnent
- [ ] Les images ont des textes alternatifs
- [ ] Le contenu est relu et corrigé

### Configuration

- [ ] `base_url` est correctement défini
- [ ] Les informations de l'auteur sont à jour
- [ ] Les liens sociaux sont corrects
- [ ] Le favicon est personnalisé

### SEO

- [ ] Chaque page a une `description` unique
- [ ] Les `keywords` sont pertinents
- [ ] Les `translation_id` relient correctement les versions linguistiques

### Performance

- [ ] Les images sont optimisées (pas plus de 500 Ko chacune)
- [ ] Le build de production fonctionne : `npm run build`

### Test

- [ ] Le site fonctionne sur mobile
- [ ] Le mode sombre s'affiche correctement
- [ ] Les deux langues (si activées) fonctionnent
- [ ] Les formulaires de contact sont testés

---

## Commandes utiles

```bash
# Développement avec live reload
npm run dev

# Build de production
npm run build

# Serveur Python alternatif
npm run dev:py

# Exécuter les tests
python -m pytest tests/
```

---

## Besoin d'aide ?

- **Documentation complète** : [README.md](../README.md)
- **Personnalisation du thème** : [docs/THEMING.md](THEMING.md)
- **Architecture du build** : [docs/BUILD_ARCHITECTURE.md](BUILD_ARCHITECTURE.md)

Bonne création de site !
