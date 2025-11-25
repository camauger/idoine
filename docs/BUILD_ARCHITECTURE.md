# IDOINE Build Architecture

This document describes the build system architecture for the IDOINE static site generator.

## Overview

IDOINE uses a hybrid build system that combines:
- **Python** for content generation (Markdown → HTML)
- **Grunt** for frontend asset processing (Sass, PostCSS)

This separation allows each tool to handle what it does best while maintaining a clean interface between them.

## Build Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUILD PROCESS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Content    │    │    Assets    │    │    Styles    │       │
│  │  (Markdown)  │    │   (Images)   │    │    (Sass)    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Python     │    │   Python     │    │    Grunt     │       │
│  │   Builder    │    │   Copy/      │    │    Sass +    │       │
│  │  (Jinja2)    │    │   Optimize   │    │   PostCSS    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┼───────────────────┘                │
│                             │                                     │
│                             ▼                                     │
│                   ┌──────────────────┐                           │
│                   │     dist/        │                           │
│                   │  (Output Site)   │                           │
│                   └──────────────────┘                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Python (Content Generation)

**Entry Point:** `scripts/core/build.py`

Responsible for:
- Parsing Markdown content with YAML frontmatter
- Rendering Jinja2 templates
- Generating HTML pages (pages, posts, glossary terms)
- Building pagination
- Creating category and tag pages
- Managing translations (multilingual support)
- Copying static assets
- Image optimization (via Pillow)

**Key Modules:**
- `scripts/core/build.py` - Main entry point, SiteBuilder class
- `scripts/core/context.py` - BuildContext for dependency injection
- `scripts/core/config_loader.py` - YAML configuration loading
- `scripts/builders/page_builder.py` - Static page generation
- `scripts/builders/post_builder.py` - Blog post generation
- `scripts/builders/glossary_builder.py` - Glossary term generation
- `scripts/builders/gallery_builder.py` - Image gallery generation
- `scripts/utils/` - Utility modules (parsing, validation, etc.)

### Grunt (Frontend Assets)

**Entry Point:** `Gruntfile.js`

Responsible for:
- Sass compilation (`.scss` → `.css`)
- PostCSS processing (Autoprefixer)
- CSS minification (production)
- Font file copying
- Development server (connect)
- File watching (watch)

**Tasks:**
- `grunt dev` - Development build with watch
- `grunt build` - Production build
- `grunt sass:dev` / `grunt sass:prod` - Sass compilation
- `grunt postcss` - Autoprefixer
- `grunt cssmin` - CSS minification

## Directory Structure

```
idoine/
├── src/                    # Source files
│   ├── config/             # Site configuration
│   │   └── site_config.yaml
│   ├── data/               # Data files
│   │   ├── translations.yaml
│   │   └── projects.yaml
│   ├── locales/            # Multilingual content
│   │   ├── fr/
│   │   │   ├── pages/
│   │   │   ├── posts/
│   │   │   └── glossaire/
│   │   └── en/
│   │       └── ...
│   ├── templates/          # Jinja2 templates
│   │   ├── base.html
│   │   ├── components/
│   │   ├── pages/
│   │   └── posts/
│   ├── styles/             # Sass source files
│   │   ├── main.scss
│   │   ├── base/
│   │   ├── components/
│   │   └── layouts/
│   └── assets/             # Static assets
│       ├── images/
│       └── fonts/
├── dist/                   # Output directory
├── scripts/                # Python build scripts
│   ├── core/
│   ├── builders/
│   └── utils/
├── tests/                  # Test suite
├── docs/                   # Documentation
├── Gruntfile.js            # Grunt configuration
├── package.json            # Node.js dependencies
└── requirements.txt        # Python dependencies
```

## Build Commands

### Development

```bash
# Start development server with watch
npm run dev
# or
grunt dev
```

This runs:
1. Python build (HTML generation)
2. Sass compilation (development mode)
3. PostCSS processing
4. Asset copying
5. Development server
6. File watching

### Production

```bash
# Production build
npm run build
# or
grunt build
```

This runs:
1. Sass compilation (production mode)
2. Python build (HTML generation)
3. PostCSS processing
4. CSS minification
5. Asset copying

## Configuration

### Site Configuration (`src/config/site_config.yaml`)

```yaml
title: My Site
description: Site description
author: Author Name
languages:
  - fr
  - en
default_lang: fr
blog_url: /blog/
glossary_url: /glossaire/
posts_per_page: 5
```

### Environment Variables

- `IDOINE_USE_ICONS` - Enable/disable emoji in logs (default: true)

## Extending the Build

### Adding a New Builder

1. Create a new file in `scripts/builders/`
2. Accept `BuildContext` in the constructor
3. Implement the build logic
4. Register in `SiteBuilder.__init__`

### Adding New Configuration

1. Add schema validation in `scripts/utils/metadata_schema.py`
2. Add defaults in `scripts/utils/constants.py`
3. Update `scripts/core/config_loader.py` if needed

## Testing

```bash
# Run all tests
python -m pytest tests/

# Run with coverage
python -m pytest tests/ --cov=scripts

# Run specific test file
python -m pytest tests/unit/test_frontmatter_parser.py
```

## Performance Considerations

- **File Caching**: Uses MD5 checksums to skip unchanged files
- **Incremental Builds**: Only processes modified content
- **Image Optimization**: Generates responsive variants with WebP
- **Path Validation**: Prevents path traversal attacks

