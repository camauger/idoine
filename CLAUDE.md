# Instructions pour Claude – Ludomancien

## Contexte du projet

**Ludomancien** est un blog francophone sur la théorie du jeu de rôle. Il propose des articles, réflexions et analyses sur la pratique du JDR : création de personnages, gestion de groupe, outils de sécurité émotionnelle, techniques narratives, etc.

**URL :** https://ludomancien.com (ou équivalent)

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Générateur | Idoine (framework maison) |
| Backend build | Python 3.10+ |
| Frontend build | Grunt + SCSS |
| Templates | Jinja2 |
| Contenu | Markdown + YAML front matter |
| Déploiement | Netlify |

## Structure du projet

```
ludomancien/
├── src/
│   ├── assets/
│   │   ├── images/          # Images des articles
│   │   ├── fonts/           # Polices web
│   │   └── gallery_images/  # Galerie
│   ├── config/
│   │   └── site_config.yaml # Configuration du site
│   ├── data/
│   │   ├── projects.yaml    # Données projets
│   │   └── translations.yaml # Traductions UI
│   ├── locales/
│   │   ├── fr/
│   │   │   ├── pages/       # Pages statiques (about, home, blog)
│   │   │   ├── posts/       # Articles du blog (33 articles)
│   │   │   └── glossaire/   # Termes du glossaire
│   │   └── en/
│   │       ├── pages/
│   │       └── posts/
│   ├── styles/              # SCSS
│   │   ├── base/
│   │   ├── components/
│   │   ├── layout/
│   │   ├── pages/
│   │   └── posts/
│   ├── scripts/             # JavaScript frontend
│   └── templates/           # Templates Jinja2
│       ├── base.html
│       ├── components/
│       ├── macros/
│       ├── pages/
│       └── posts/
├── scripts/                 # Scripts Python de build
├── tests/                   # Tests
├── dist/                    # Output (gitignored)
├── Gruntfile.js
├── package.json
├── requirements.txt
└── netlify.toml
```

## Commandes principales

```bash
# Installation
pip install -r requirements.txt
npm install

# Développement
python scripts/dev_server.py    # ou grunt dev
grunt watch                     # Watch SCSS

# Build production
python scripts/build.py         # ou grunt build
grunt build

# Déploiement
# Automatique via Netlify sur push
```

## Format des articles

Les articles sont en Markdown avec front matter YAML :

```yaml
---
name: Titre de l'article
description: Description courte pour SEO
slug: url-de-larticle
date: 2024-01-15
modif: 2024-01-20           # Optionnel
tags: ["jeux de rôle", "création"]
banner: /images/banner.jpg
thumbnail: /images/thumbnails/banner.jpg
---

Contenu en Markdown...

[[toc]]   # Table des matières automatique
```

## Conventions

### Nommage des fichiers
- Articles : `slug-de-larticle.md` (minuscules, tirets)
- Images : même slug que l'article si spécifiques

### Images
- Banner : 1200x630px (ratio 1.91:1)
- Thumbnail : 400x300px
- Format : JPG ou PNG optimisé

### Tags courants
- "jeux de rôle"
- "création"
- "mythologie"
- "sécurité"
- "conseils"
- "game design"

## Points d'attention

1. **Encodage** : UTF-8 obligatoire pour le français
2. **Images** : Toujours optimiser avant ajout
3. **Liens** : Vérifier les liens externes régulièrement
4. **SEO** : Toujours remplir `description` dans le front matter
5. **i18n** : Le site supporte FR et EN, mais le contenu est principalement FR

## Contenu actuel

- **33 articles** publiés
- **1 brouillon** (outils-images.md)
- Thèmes principaux :
  - Création de personnages
  - Outils de sécurité émotionnelle
  - Techniques de MJ
  - Analyses de jeux
  - Projets personnels (Aristie, Helvegen, Locquemare)

## Relation avec autres projets

- **jeuxderole.org** : Glossaire JDR (projet complémentaire)
- **sessionzero** : Outil session zéro (à intégrer potentiellement)
- **fantasyvixens** : Autre site Idoine (même stack)

---

*Dernière mise à jour : 4 février 2026*
