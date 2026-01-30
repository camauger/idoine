"""
Pytest configuration and shared fixtures for IDOINE tests.

This module provides common fixtures used across unit and integration tests.
"""

import sys
from pathlib import Path

import pytest

# Add scripts directory to path for imports
scripts_dir = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(scripts_dir))


@pytest.fixture
def sample_markdown_content() -> str:
    """Sample Markdown content with frontmatter for testing."""
    return """---
title: Test Page
description: A test page description
date: 2025-11-25
author: Test Author
slug: test-page
categories:
  - Category 1
  - Category 2
meta_keywords:
  - keyword1
  - keyword2
tags:
  - tag1
  - tag2
---

# Test Heading

This is test content with **bold** and *italic* text.

## Second Heading

More content here.
"""


@pytest.fixture
def sample_markdown_no_frontmatter() -> str:
    """Sample Markdown content without frontmatter."""
    return """# Just Content

This is content without any frontmatter.
"""


@pytest.fixture
def sample_frontmatter_dict() -> dict:
    """Expected parsed frontmatter dictionary."""
    return {
        "title": "Test Page",
        "description": "A test page description",
        "date": "2025-11-25",
        "author": "Test Author",
        "slug": "test-page",
        "categories": ["Category 1", "Category 2"],
        "meta_keywords": ["keyword1", "keyword2"],
        "tags": ["tag1", "tag2"],
    }


@pytest.fixture
def temp_site_structure(tmp_path: Path) -> dict:
    """
    Create a temporary site structure for integration tests.

    Returns a dictionary with paths to src and dist directories.
    """
    src_path = tmp_path / "src"
    dist_path = tmp_path / "dist"

    # Create directory structure
    (src_path / "config").mkdir(parents=True)
    (src_path / "data").mkdir(parents=True)
    (src_path / "locales" / "fr" / "pages").mkdir(parents=True)
    (src_path / "locales" / "fr" / "posts").mkdir(parents=True)
    (src_path / "locales" / "en" / "pages").mkdir(parents=True)
    (src_path / "templates" / "components").mkdir(parents=True)
    (src_path / "templates" / "pages").mkdir(parents=True)
    (src_path / "templates" / "posts").mkdir(parents=True)
    dist_path.mkdir(parents=True)

    # Create minimal site configuration
    site_config = src_path / "config" / "site_config.yaml"
    site_config.write_text("""
title: Test Site
description: A test site for unit testing
author: Test Author
languages:
  - fr
  - en
default_lang: fr
blog_url: /blog/
glossary_url: /glossaire/
posts_per_page: 5
""")

    # Create translations
    translations = src_path / "data" / "translations.yaml"
    translations.write_text("""
fr:
  site_name: Site de Test
  blog_title: Blog
  home_title: Accueil
en:
  site_name: Test Site
  blog_title: Blog
  home_title: Home
""")

    # Create projects data
    projects = src_path / "data" / "projects.yaml"
    projects.write_text("""
projects: []
""")

    # Create minimal base template
    base_template = src_path / "templates" / "base.html"
    base_template.write_text("""<!DOCTYPE html>
<html lang="{{ page.lang }}">
<head>
  <meta charset="UTF-8">
  <title>{{ page.title }} - {{ site.title }}</title>
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
""")

    # Create home template
    home_template = src_path / "templates" / "pages" / "home.html"
    home_template.write_text("""{% extends "base.html" %}
{% block content %}
<main>{{ content | safe }}</main>
{% endblock %}
""")

    # Create sample home page
    home_page_fr = src_path / "locales" / "fr" / "pages" / "home.md"
    home_page_fr.write_text("""---
title: Accueil
description: Page d'accueil
template: pages/home.html
---

# Bienvenue

Contenu de la page d'accueil.
""")

    return {
        "src": src_path,
        "dist": dist_path,
        "tmp": tmp_path,
    }


@pytest.fixture
def site_config() -> dict:
    """Sample site configuration dictionary."""
    return {
        "title": "Test Site",
        "description": "A test site",
        "author": "Test Author",
        "languages": ["fr", "en"],
        "default_lang": "fr",
        "blog_url": "/blog/",
        "glossary_url": "/glossaire/",
        "posts_per_page": 5,
        "terms_per_page": 10,
    }


@pytest.fixture
def translations() -> dict:
    """Sample translations dictionary."""
    return {
        "fr": {
            "site_name": "Site de Test",
            "blog_title": "Blog",
            "home_title": "Accueil",
            "read_more": "Lire la suite",
        },
        "en": {
            "site_name": "Test Site",
            "blog_title": "Blog",
            "home_title": "Home",
            "read_more": "Read more",
        },
    }

