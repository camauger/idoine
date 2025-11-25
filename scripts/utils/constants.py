"""
Centralized constants for the IDOINE static site generator.

This module contains all magic strings, numbers, and default values
used throughout the build system.
"""

from typing import Dict, Tuple

# =============================================================================
# Default Pagination Values
# =============================================================================
DEFAULT_POSTS_PER_PAGE: int = 5
DEFAULT_TERMS_PER_PAGE: int = 10

# =============================================================================
# Default Templates
# =============================================================================
DEFAULT_POST_TEMPLATE: str = "posts/post.html"
DEFAULT_BLOG_TEMPLATE: str = "pages/blog.html"
DEFAULT_HOME_TEMPLATE: str = "pages/home.html"
DEFAULT_GLOSSARY_TEMPLATE: str = "pages/glossary.html"
DEFAULT_TERM_TEMPLATE: str = "pages/glossary-term.html"
DEFAULT_CATEGORY_TEMPLATE: str = "pages/category.html"
DEFAULT_KEYWORD_TEMPLATE: str = "pages/keyword.html"
DEFAULT_GALLERY_TEMPLATE: str = "pages/gallery.html"
DEFAULT_IMAGE_TEMPLATE: str = "pages/image.html"

# =============================================================================
# URL Patterns
# =============================================================================
DEFAULT_BLOG_URL: str = "/blog/"
DEFAULT_GLOSSARY_URL: str = "/glossaire/"
DEFAULT_GALLERY_URL: str = "/gallery/"
DEFAULT_CATEGORIES_URL: str = "categories"
DEFAULT_KEYWORDS_URL: str = "keywords"

# =============================================================================
# Image Processing
# =============================================================================
SUPPORTED_IMAGE_EXTENSIONS: Tuple[str, ...] = (".png", ".jpg", ".jpeg", ".gif", ".webp")

IMAGE_SIZES: Dict[str, int] = {
    "small": 300,
    "medium": 800,
    "large": 1200,
}

IMAGE_QUALITY: Dict[str, int] = {
    "jpeg": 85,
    "webp": 85,
    "avif": 80,
}

# =============================================================================
# File Extensions
# =============================================================================
MARKDOWN_EXTENSIONS: Tuple[str, ...] = (".md", ".markdown")
TEMPLATE_EXTENSIONS: Tuple[str, ...] = (".html", ".jinja2", ".j2")
STYLE_EXTENSIONS: Tuple[str, ...] = (".css", ".scss", ".sass")

# =============================================================================
# Date Formats
# =============================================================================
DATE_FORMAT_PATTERNS: Dict[str, str] = {
    "full": "EEEE d MMMM y",
    "long": "d MMMM y",
    "medium": "d MMM y",
    "short": "dd/MM/y",
}

DEFAULT_DATE_FORMAT: str = "long"
DEFAULT_LOCALE: str = "fr_FR"

# =============================================================================
# Logging Icons
# =============================================================================
ICON_START: str = "🚀"
ICON_CLEAN: str = "🧹"
ICON_COPY: str = "📋"
ICON_BUILD: str = "📝"
ICON_GLOSSARY: str = "📖"
ICON_CATEGORY: str = "📂"
ICON_REDIRECT: str = "🔀"
ICON_SUCCESS: str = "✨"
ICON_ERROR: str = "❌"
ICON_TAG: str = "🔖"
ICON_PAGE: str = "📄"
ICON_PAGINATION: str = "📢"

