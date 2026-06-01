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
│                        BUILD PROCESS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Content    │    │    Assets    │    │    Styles    │      │
│  │  (Markdown)  │    │   (Images)   │    │    (Sass)    │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Python     │    │   Python     │    │    Grunt     │      │
│  │   Builder    │    │   Copy/      │    │    Sass +    │      │
│  │  (Jinja2)    │    │   Optimize   │    │   PostCSS    │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                             ▼                                   │
│                   ┌──────────────────┐                          │
│                   │     dist/        │                          │
│                   │  (Output Site)   │                          │
│                   └──────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Python (Content Generation)

**Entry Point:** `scripts/core/build.py`

Responsible for:
- Parsing Markdown content with YAML frontmatter
- Rendering Jinja2 templates
- Generating HTML pages (pages, posts, glossary terms, gallery)
- Building pagination
- Creating category, tag, and keyword pages
- Managing translations (multilingual support)
- Copying static assets with path validation
- Image optimization and responsive variant generation (via Pillow)

**Key Modules:**

```
scripts/
├── core/                        # Core build system
│   ├── build.py                 # Main entry point, SiteBuilder class
│   ├── context.py               # BuildContext for dependency injection
│   ├── config_loader.py         # YAML configuration loading
│   ├── config_schema.py         # Pydantic schema for site_config.yaml
│   ├── static_file_manager.py   # Static file operations with caching
│   ├── template_renderer.py     # Jinja2 template rendering
│   ├── url_router.py            # URL generation logic
│   ├── content_processor.py     # Markdown/frontmatter processing
│   └── metadata_processor.py    # Metadata normalization
│
├── builders/                    # Content generators
│   ├── page_builder.py          # Static page generation
│   ├── post_builder.py          # Blog post generation with pagination
│   ├── glossary_builder.py      # Glossary term generation with tags
│   └── gallery_builder.py       # Image gallery with responsive variants
│
├── utils/                       # Utility modules
│   ├── constants.py             # Centralized magic strings/numbers
│   ├── frontmatter_parser.py    # YAML frontmatter parsing
│   ├── metadata_schema.py       # Pydantic schemas for content metadata
│   ├── image_processor.py       # Pillow-based image optimization
│   ├── file_cache.py            # MD5 checksum caching for incremental builds
│   ├── path_validator.py        # Path traversal prevention
│   ├── exceptions.py            # Custom exception hierarchy
│   ├── logger.py                # Configurable logging with icons
│   ├── gallery_utils.py         # Gallery helper functions
│   └── utils.py                 # Core utilities (markdown, slugify, etc.)
│
└── dev_server.py                # Python development server with hot reload
```

### Grunt (Frontend Assets)

**Entry Point:** `Gruntfile.js`

Responsible for:
- Sass compilation (`.scss` → `.css`)
- PostCSS processing (Autoprefixer)
- CSS minification (production)
- Font file copying
- Image copying
- JavaScript copying
- Development server (connect)
- File watching (watch)

**Tasks:**
- `grunt dev` - Development build with watch and live reload
- `grunt build` - Production build with minification
- `grunt sass:dev` / `grunt sass:prod` - Sass compilation
- `grunt postcss:dev` / `grunt postcss:prod` - Autoprefixer
- `grunt cssmin:prod` - CSS minification
- `grunt copy` - Asset copying (fonts, images, scripts)

## Directory Structure

```
idoine/
├── src/                         # Source files
│   ├── config/                  # Site configuration
│   │   └── site_config.yaml
│   ├── data/                    # Data files
│   │   ├── translations.yaml    # UI translations (fr/en)
│   │   └── projects.yaml        # Portfolio projects
│   ├── locales/                 # Multilingual content
│   │   ├── fr/
│   │   │   ├── pages/           # Static pages (home.md, about.md, etc.)
│   │   │   ├── posts/           # Blog posts
│   │   │   └── glossaire/       # Glossary terms
│   │   └── en/
│   │       ├── pages/
│   │       └── posts/
│   ├── templates/               # Jinja2 templates
│   │   ├── base.html            # Base template
│   │   ├── page.html            # Page wrapper
│   │   ├── components/          # Reusable components
│   │   │   ├── header.html
│   │   │   ├── footer.html
│   │   │   ├── lang-switcher.html
│   │   │   ├── pagination.html
│   │   │   └── ...
│   │   ├── macros/              # Jinja2 macros
│   │   ├── pages/               # Page-specific templates
│   │   └── posts/               # Post templates
│   ├── styles/                  # Sass source files
│   │   ├── main.scss            # Main entry point
│   │   ├── base/                # Reset, variables, typography, fonts
│   │   ├── components/          # Component styles
│   │   └── layout/              # Layout styles (header, footer)
│   ├── scripts/                 # Frontend JavaScript
│   │   ├── main.js              # Entry point
│   │   ├── languageSwitcher.js
│   │   ├── themeToggle.js
│   │   ├── navigation.js
│   │   └── gallery.js
│   └── assets/                  # Static assets
│       ├── images/
│       ├── fonts/               # Self-hosted fonts
│       │   ├── montserrat/
│       │   ├── cinzel-decorative/
│       │   └── fontawesome/
│       └── gallery_images/      # Gallery source images
├── dist/                        # Output directory (generated)
├── scripts/                     # Python build scripts
├── tests/                       # Test suite
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/                        # Documentation
├── Gruntfile.js                 # Grunt configuration
├── package.json                 # Node.js dependencies
├── requirements.txt             # Python dependencies
└── netlify.toml                 # Netlify deployment config
```

## Build Commands

### Development

```bash
# Start Grunt development server with watch (port 9000)
npm run dev
# or
grunt dev

# Start Python development server with hot reload (port 8000)
npm run dev:py
# or
python scripts/dev_server.py
```

The `grunt dev` command runs:
1. Python build (HTML generation)
2. Sass compilation (development mode with sourcemaps)
3. PostCSS processing
4. Asset copying (fonts, images, scripts)
5. Development server on port 9000
6. File watching with live reload

### Production

```bash
# Production build
npm run build
# or
grunt build
```

This runs:
1. Sass compilation (production mode, compressed)
2. Python build (HTML generation)
3. PostCSS processing
4. CSS minification
5. Asset copying

### Python Build Only

```bash
# Run Python build directly
python scripts/core/build.py --build
```

## Configuration

### Site Configuration (`src/config/site_config.yaml`)

```yaml
title: My Site
description: Site description
author: Author Name
base_url: https://example.com

# Languages
languages:
  - fr
  - en
default_lang: fr
language_names:
  fr: Français
  en: English

# URLs
blog_url: /blog/
glossary_url: /glossaire/
gallery_url: /gallery/

# Pagination
posts_per_page: 5
terms_per_page: 10

# Templates (optional overrides)
post_template: posts/post.html
blog_template: pages/blog.html
home_template: pages/home.html
glossary_template: pages/glossary.html
term_template: pages/glossary-term.html
gallery_template: pages/gallery.html
image_template: pages/image.html
```

### Environment Variables

- `IDOINE_USE_ICONS` - Enable/disable emoji in logs (default: `true`)

### Content Frontmatter

```yaml
---
title: Page Title
description: SEO description
date: 2025-01-01
author: Author Name
slug: url-slug
translation_id: unique-id-for-translations
categories: [category1, category2]
meta_keywords: [keyword1, keyword2]
tags: [tag1, tag2]
template: pages/custom.html
thumbnail: image.jpg
---

Markdown content here...
```

## Extending the Build

### Adding a New Builder

1. Create a new file in `scripts/builders/`
2. Accept `BuildContext` in the constructor
3. Implement the build logic
4. Register in `SiteBuilder.__init__` in `scripts/core/build.py`

Example:

```python
from core.context import BuildContext

class MyBuilder:
    def __init__(self, context: BuildContext):
        self.src_path = context.src_path
        self.dist_path = context.dist_path
        self.site_config = context.site_config
        self.translations = context.translations
        self.jinja_env = context.jinja_env
        self.projects = context.projects

    def build(self):
        # Implementation here
        pass
```

### Adding New Configuration

1. Add schema validation in `scripts/core/config_schema.py` (Pydantic)
2. Add defaults in `scripts/utils/constants.py`
3. Update `scripts/core/config_loader.py` if needed

### Adding New Metadata Fields

1. Update `scripts/utils/metadata_schema.py` with Pydantic validators
2. Update `scripts/utils/frontmatter_parser.py` if special handling needed

## Testing

```bash
# Run all tests
python -m pytest tests/

# Run with coverage
python -m pytest tests/ --cov=scripts

# Run specific test file
python -m pytest tests/unit/test_frontmatter_parser.py -v

# Run integration tests only
python -m pytest tests/integration/ -v
```

## Performance Considerations

- **File Caching**: Uses MD5 checksums (`scripts/utils/file_cache.py`) to skip unchanged files
- **Incremental Builds**: `StaticFileManager` only copies modified files
- **Image Optimization**: Generates responsive variants (small/medium/large) with WebP format
- **Path Validation**: Prevents path traversal attacks (`scripts/utils/path_validator.py`)
- **Debounced Watching**: 250ms debounce delay prevents multiple rebuilds

## Security

- **Path Validation**: All file operations validate paths against base directories
- **Input Validation**: Pydantic schemas validate frontmatter and configuration
- **Safe File Names**: `sanitize_filename()` removes dangerous characters
- **No External CDN**: Fonts are self-hosted to avoid tracking

## Multilingual Support

The language switcher (`src/templates/components/lang-switcher.html`) uses:
- `translation_id` in frontmatter to link translations
- `page.content_translations` dict mapping `{lang: url}`
- Fallback URL construction for pages without explicit translations

Pages are built by `page_builder.py` which:
1. Scans all language directories
2. Builds a translation map from `translation_id`
3. Passes `content_translations` to templates

## Theming

IDOINE is designed as a **theme builder** with a flexible theming system based on CSS custom properties.

For detailed theming documentation, see **[THEMING.md](./THEMING.md)**.

### Quick Overview

- **CSS Variables**: All theme tokens (colors, fonts, spacing) are defined in `src/styles/base/_variables.scss`
- **Dark Mode**: Built-in support via `[data-theme="dark"]` selector
- **Custom Themes**: Create new themes by overriding CSS variables
- **Self-Hosted Fonts**: Fonts are bundled in `src/assets/fonts/` for privacy and performance
- **Modular SCSS**: Component-based architecture for easy customization

### Theme Files

```
src/styles/
├── base/
│   ├── _variables.scss    # Theme tokens (colors, fonts, spacing)
│   ├── _fonts.scss        # @font-face declarations
│   └── _typography.scss   # Text styles
├── components/            # Reusable UI components
├── layout/                # Structural styles
└── pages/                 # Page-specific styles
```
