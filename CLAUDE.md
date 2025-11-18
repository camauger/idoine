# CLAUDE.md - AI Assistant Guide for IDOINE

This document provides comprehensive guidance for AI assistants working with the IDOINE static site generator codebase.

## Project Overview

**IDOINE** is a multilingual static site generator built with a hybrid Python/Node.js architecture. It combines the power of Python for content processing (Jinja2 templates, Markdown parsing) with Node.js/Grunt for asset management (SASS compilation, file watching, development server).

### Key Technologies
- **Python 3.9+**: Core build logic, content generation
- **Node.js 18+**: Asset pipeline, development tooling
- **Jinja2**: HTML templating engine
- **Grunt**: Task runner for development and production builds
- **SASS**: CSS preprocessing
- **Markdown + YAML Frontmatter**: Content authoring

### Project Type
Static site generator with native multilingual support, optimized for blogs and content-heavy sites.

---

## Architecture Overview

### Build System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     npm run dev/build                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │   Grunt Tasks   │
              └────────┬────────┘
                       │
          ┌────────────┴─────────────┐
          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│  Python Build    │      │  SASS/Assets     │
│  (scripts/*.py)  │      │  (Grunt tasks)   │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         │                         │
         ▼                         ▼
    ┌────────────────────────────────┐
    │         dist/ folder           │
    │    (deployable site)           │
    └────────────────────────────────┘
```

### Component Responsibilities

1. **Python Scripts (`scripts/`)**: Read Markdown files, parse frontmatter, render Jinja2 templates, generate HTML
2. **Grunt Tasks**: Compile SASS, watch files, serve development server, optimize assets for production
3. **Content (`src/locales/`)**: Language-specific Markdown files with frontmatter metadata
4. **Templates (`src/templates/`)**: Jinja2 HTML templates
5. **Configuration**: YAML-based site configuration and translations

---

## Project Structure

```
idoine/
├── dist/                       # Generated static site (gitignored)
├── scripts/                    # Python build scripts
│   ├── build.py                # Main build orchestrator
│   ├── page_builder.py         # Generates static pages
│   ├── post_builder.py         # Generates blog posts
│   ├── glossary_builder.py     # Generates glossary pages
│   ├── gallery_builder.py      # Generates image galleries
│   ├── config_loader.py        # Loads YAML configuration
│   ├── frontmatter_parser.py   # Parses Markdown frontmatter
│   ├── static_file_manager.py  # Manages static file copying
│   ├── utils.py                # Shared utilities (filters, helpers)
│   └── metadata.py             # Metadata processing
├── src/
│   ├── assets/                 # Static files
│   │   ├── fonts/
│   │   └── images/
│   ├── config/
│   │   └── site_config.yaml    # Main site configuration
│   ├── data/
│   │   ├── translations.yaml   # UI translations per language
│   │   └── projects.yaml       # Project data
│   ├── locales/                # Content organized by language
│   │   ├── en/
│   │   │   ├── pages/          # English pages (.md files)
│   │   │   └── posts/          # English blog posts (.md files)
│   │   └── fr/
│   │       ├── pages/          # French pages (.md files)
│   │       └── glossaire/      # French glossary terms (.md files)
│   ├── scripts/                # Frontend JavaScript
│   ├── styles/                 # SASS stylesheets
│   │   └── main.scss           # Main SASS entry point
│   └── templates/              # Jinja2 templates
│       ├── base.html           # Base template
│       ├── components/         # Reusable components
│       └── pages/              # Page-specific templates
├── tests/                      # Python tests
├── .gitignore
├── Gruntfile.js                # Grunt task configuration
├── netlify.toml                # Netlify deployment config
├── package.json                # Node.js dependencies & scripts
├── requirements.txt            # Python dependencies
├── requirements.in             # Python dependency source
└── README.md
```

---

## Core Components

### 1. Build System (`scripts/build.py`)

The main entry point for site generation. When run with `--build` flag:

1. Cleans output directory (`dist/`)
2. Copies static files
3. Builds galleries from image directories
4. Generates pages from Markdown files
5. Generates blog posts
6. Builds glossary terms
7. Creates category and keyword index pages
8. Generates root redirect (for multilingual sites)

**Key Class**: `SiteBuilder`

**Important**: All builder classes receive consistent parameters:
- `src_path`: Source directory path
- `dist_path`: Distribution directory path
- `site_config`: Site configuration dictionary
- `translations`: UI translation dictionary
- `jinja_env`: Configured Jinja2 environment
- `projects`: Project data dictionary

### 2. Content Processing

#### Frontmatter Format
All Markdown files use YAML frontmatter:

```markdown
---
title: "Page Title"
description: "Meta description"
meta_keywords: [keyword1, keyword2]
categories: [category1, category2]
date: 2025-01-15
slug: custom-url-slug
---

# Markdown content here
```

**Parsing**: `scripts/frontmatter_parser.py` handles frontmatter extraction and ensures list fields (`categories`, `meta_keywords`, `tags`) are properly formatted.

#### Builder Pattern
Each content type has a dedicated builder:
- `PageBuilder`: Static pages (home, about, etc.)
- `PostBuilder`: Blog posts with pagination
- `GlossaryBuilder`: Glossary/dictionary terms
- `GalleryBuilder`: Image galleries

### 3. Templating (Jinja2)

**Template Hierarchy**:
- `base.html`: Base layout with common structure
- `pages/*.html`: Page-specific templates
- `components/*.html`: Reusable components (nav, footer, etc.)

**Available Context Variables**:
- `site`: Site configuration (`site_config.yaml`)
- `page`: Current page metadata
- `content`: Rendered HTML content
- `t`: Translations dictionary
- `projects`: Project data
- `is_multilingual`: Boolean flag
- `is_unilingual`: Boolean flag

**Custom Filters**:
- `date`: Format dates using Babel (e.g., `{{ page.date|date('long', 'fr_FR') }}`)
- `markdown`: Convert Markdown to HTML
- `slugify`: Convert strings to URL-safe slugs

### 4. Configuration Files

#### `src/config/site_config.yaml`
Global site settings:
- Site title, tagline, URLs
- Supported languages and default language
- Social media links
- Default metadata

#### `src/data/translations.yaml`
UI translations for each language (navigation labels, button text, etc.)

#### `src/data/projects.yaml`
Structured project data (currently empty, can be populated)

---

## Development Workflow

### Setup

```bash
# Install Node dependencies
npm install

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows: venv\Scripts\activate
# On macOS/Linux: source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Development

```bash
# Start development server with live reload
npm run dev

# Runs:
# - Python build scripts
# - SASS compilation (dev mode with sourcemaps)
# - Static file copying
# - Development server on http://localhost:9000
# - File watchers for auto-rebuild
```

**Watched Files**:
- `src/styles/**/*.scss` → Triggers SASS compilation
- `src/assets/**/*` → Triggers asset copying
- `content/**/*`, `templates/**/*` → Triggers Python build

### Production Build

```bash
# Build optimized production site
npm run build

# Runs:
# - Python build scripts
# - SASS compilation (compressed, no sourcemaps)
# - CSS minification
# - Asset copying
# Output: dist/ folder ready for deployment
```

### Testing

```bash
# Run Python tests
pytest tests/

# Run with coverage
pytest --cov=scripts tests/
```

---

## Key Conventions

### 1. File Naming
- **Markdown files**: Use descriptive names, will be converted to slugs
- **Python modules**: snake_case (e.g., `post_builder.py`)
- **Templates**: kebab-case or descriptive names (e.g., `main-nav.html`)
- **SASS partials**: Prefix with underscore (e.g., `_variables.scss`)

### 2. URL Structure

**Multilingual Mode** (default):
```
/{lang}/{page}           # e.g., /fr/, /en/about/
/{lang}/blog/{slug}      # e.g., /fr/blog/my-post/
/{lang}/glossaire/{term} # e.g., /fr/glossaire/terme/
```

**Unilingual Mode** (if configured):
```
/{page}             # e.g., /, /about/
/blog/{slug}        # e.g., /blog/my-post/
/glossary/{term}    # e.g., /glossary/term/
```

### 3. Content Organization
- **Pages**: General site pages (home, about, contact)
- **Posts**: Blog entries with dates, categories, keywords
- **Glossaire/Glossary**: Term definitions with optional tags
- Each language has its own directory under `src/locales/`

### 4. Python Code Style
- **Formatting**: Uses `black` (see `requirements.txt`)
- **Linting**: Uses `flake8`
- **Type hints**: Encouraged but not fully enforced
- **Docstrings**: Use for complex functions
- **Imports**: Standard library → Third-party → Local modules

### 5. Logging
Uses Python `logging` module with Unicode icons:
- 🚀 Build start
- 🧹 Cleanup
- 📋 Copying files
- 📝 Building content
- ✨ Success
- ❌ Error

**Note**: Icons may cause issues on some terminals (see `IMPROVEMENTS.md`)

---

## Common Tasks for AI Assistants

### Adding a New Page

1. Create Markdown file in `src/locales/{lang}/pages/{page-name}.md`
2. Add frontmatter with required fields (title, description)
3. Write content in Markdown
4. Optionally create a custom template in `src/templates/pages/`
5. Run build to generate HTML

### Adding a Blog Post

1. Create Markdown file in `src/locales/{lang}/posts/{post-name}.md`
2. Add frontmatter with: title, date, description, categories, meta_keywords
3. Write post content
4. Run build - post will appear in blog index automatically

### Modifying Templates

1. Edit Jinja2 templates in `src/templates/`
2. Use `{{ page }}`, `{{ site }}`, `{{ t }}` context variables
3. Test changes with `npm run dev` (auto-reload enabled)

### Adding Translations

1. Add new keys to `src/data/translations.yaml` under each language
2. Reference in templates: `{{ t[lang]['key_name'] }}`

### Styling Changes

1. Edit SASS files in `src/styles/`
2. Main entry point: `src/styles/main.scss`
3. Development: `npm run dev` watches for changes
4. Production: Outputs minified CSS to `dist/styles/main.min.css`

### Debugging Build Issues

1. Check Python logs for detailed error messages with icons
2. Common issues:
   - Missing frontmatter fields
   - Invalid YAML syntax
   - Template reference errors
   - Path issues in multilingual mode
3. Run `python scripts/build.py --build` directly for isolated testing

---

## Important Implementation Details

### 1. Multilingual Support

**Detection**: Site is multilingual if `site_config.yaml` has multiple languages in `languages` array.

**Jinja Globals**:
- `is_multilingual`: True if multiple languages configured
- `is_unilingual`: True if single language

**Content Translations**: Pages can define `content_translations` in frontmatter to link equivalent pages in other languages.

### 2. Pagination

Handled by `PostBuilder`. Default: 5 posts per page (hardcoded, should be configurable - see `IMPROVEMENTS.md`).

Posts are sorted by date (newest first) and paginated automatically.

### 3. Static Files

`StaticFileManager` handles:
- Cleaning `dist/` directory
- Creating necessary subdirectories
- Copying fonts, images, and other assets

**Optimization**: Currently copies files as-is. Image optimization not implemented (see `IMPROVEMENTS.md`).

### 4. Gallery System

`GalleryBuilder` generates galleries from image directories:
- Scans for supported image formats (PNG, JPG, JPEG, GIF)
- Creates gallery index pages
- Individual image pages with metadata

**Note**: No automatic thumbnail generation (see `IMPROVEMENTS.md`)

### 5. Glossary System

`GlossaryBuilder` creates dictionary/glossary pages:
- One page per term
- Optional tags for categorization
- Index page with all terms

---

## Code Quality Guidelines

### From IMPROVEMENTS.md Analysis

**High Priority Issues**:
1. **Constructor Complexity**: Builder classes have 6-7 parameters. Consider creating a `BuildContext` object.
2. **Error Handling**: Inconsistent exception handling across modules. Use custom exceptions.
3. **Image Processing**: No optimization or responsive image generation.

**Medium Priority**:
1. **Hardcoded Values**: Many magic strings/numbers. Create `constants.py`.
2. **Unicode Icons**: May break in some terminals. Add `--plain-logs` option.
3. **Type Hints**: Not consistently applied.

**When Making Changes**:
- Follow existing patterns in the codebase
- Run `black` for formatting: `black scripts/`
- Run `flake8` for linting: `flake8 scripts/`
- Add tests for new functionality
- Update this documentation if adding major features

---

## Deployment

### Netlify (Default)

Configuration in `netlify.toml`:
- **Build command**: `npm install -g grunt-cli sass && npm install && pip install -r requirements.txt && grunt build`
- **Publish directory**: `dist`
- **Node version**: 18
- **Python version**: 3.11

### Manual Deployment

1. Run `npm run build` locally
2. Upload `dist/` folder contents to any static hosting service
3. Ensure server supports:
   - UTF-8 encoding
   - Clean URLs (optional but recommended)
   - HTTPS (recommended)

---

## Environment Variables

Currently minimal. Check `env.example` for any required environment variables.

**Note**: No sensitive data should be committed. Use `.env` file (gitignored) for local secrets.

---

## Testing Strategy

### Current State
- Basic tests in `tests/test_utils.py`
- Uses `pytest` framework
- Coverage is minimal

### When Adding Tests
1. Create test files in `tests/` directory
2. Follow naming: `test_*.py`
3. Run with `pytest tests/`
4. Mock file I/O when possible
5. Test edge cases (empty frontmatter, missing files, etc.)

---

## Troubleshooting

### Build Fails

**Python errors**:
- Check virtual environment is activated
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check for frontmatter syntax errors in `.md` files

**Grunt errors**:
- Verify Node modules installed: `npm install`
- Check Grunt CLI installed globally: `npm install -g grunt-cli`
- Verify SASS compiler available

### Live Reload Not Working

- Check `connect` and `watch` tasks in `Gruntfile.js`
- Verify port 9000 is available
- Check browser console for LiveReload errors

### Multilingual Links Broken

- Verify `languages` array in `site_config.yaml`
- Check `content_translations` in frontmatter
- Ensure content exists in all configured languages

### Missing CSS

- Run `npm run build` to compile SASS
- Check `dist/styles/main.css` or `main.min.css` exists
- Verify SASS compilation didn't error

---

## Quick Reference

### Key Files to Check First
1. `src/config/site_config.yaml` - Site-wide settings
2. `scripts/build.py` - Build orchestration
3. `Gruntfile.js` - Asset pipeline configuration
4. `src/data/translations.yaml` - UI translations
5. `package.json` & `requirements.txt` - Dependencies

### Key Commands
```bash
npm run dev          # Development mode with live reload
npm run build        # Production build
python scripts/build.py --build  # Run Python build only
grunt sass:dev       # Compile SASS for development
grunt sass:prod      # Compile and minify SASS for production
pytest tests/        # Run tests
black scripts/       # Format Python code
flake8 scripts/      # Lint Python code
```

### Helpful Utilities (`scripts/utils.py`)
- `markdown_filter(text)`: Convert Markdown to HTML
- `format_date_filter(value, fmt, lang)`: Format dates with Babel
- `slugify(value)`: Convert string to URL-safe slug
- `build_page(...)`: Render page with Jinja2 template

---

## Related Documentation

- `README.md`: User-facing documentation, setup instructions
- `IMPROVEMENTS.md`: Detailed code review and improvement suggestions
- `GEMINI.md`: Instructions for Gemini AI (similar purpose to this file)
- `netlify.toml`: Deployment configuration
- `package.json`: Node.js scripts and dependencies
- `requirements.txt`: Python dependencies

---

## Version Information

- **Node.js**: 18+
- **Python**: 3.9+ (3.11 recommended for Netlify)
- **Grunt**: 1.6+
- **SASS**: 1.69+
- **Jinja2**: 3.1+
- **Markdown**: 3.8+

---

## Notes for AI Assistants

### Preferred Approach
- **Read before write**: Always read existing files to understand current patterns
- **Consistency**: Match existing code style and architecture
- **Test changes**: Suggest running `npm run dev` to verify changes
- **Document**: Update relevant documentation when making significant changes
- **Incremental**: Prefer small, focused changes over large rewrites

### Common Pitfalls to Avoid
- Don't create new files without checking if similar functionality exists
- Don't hardcode values that should be in configuration files
- Don't break multilingual support by assuming single language
- Don't ignore existing error handling patterns
- Don't add dependencies without updating `package.json` or `requirements.txt`

### When in Doubt
- Check existing builder classes for patterns
- Review `utils.py` for available helper functions
- Consult `IMPROVEMENTS.md` for known issues
- Test in development mode before suggesting production builds

---

**Last Updated**: 2025-11-18
**Maintainer**: Christian Amauger <christian@amauger.com>
**License**: MIT
