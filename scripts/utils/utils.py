"""
Core utility functions for the IDOINE static site generator.

This module provides essential utilities for:
- Markdown to HTML conversion
- Page generation with Jinja2 templates
- Date formatting with internationalization
- URL slug generation
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union

import frontmatter
import markdown
from babel.dates import format_date
from jinja2 import Environment
from unidecode import unidecode

from .constants import DATE_FORMAT_PATTERNS, DEFAULT_DATE_FORMAT, DEFAULT_LOCALE


def markdown_filter(text: str) -> str:
    """
    Convert Markdown text to HTML.

    Args:
        text: Markdown formatted string.

    Returns:
        HTML string with converted content.

    Example:
        >>> markdown_filter("# Hello World")
        '<h1>Hello World</h1>'
    """
    return markdown.markdown(text, extensions=["meta"])


def build_page(
    content: str,
    template_name: str,
    lang: str,
    custom_url: Optional[str],
    is_post: bool,
    slug: Optional[str],
    translations: Dict[str, Any],
    site_config: Dict[str, Any],
    projects: Any,
    jinja_env: Environment,
    content_translations: Optional[Dict[str, str]] = None,
    pagination: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generate an HTML page using a Jinja2 template.

    This function delegates to specialized classes for better separation
    of concerns:
    - ContentProcessor: Parses frontmatter and converts Markdown
    - MetadataProcessor: Normalizes and enriches metadata
    - URLRouter: Generates URLs (when custom_url not provided)
    - TemplateRenderer: Handles Jinja2 rendering

    Args:
        content: Raw Markdown content with frontmatter.
        template_name: Path to the Jinja2 template file.
        lang: Language code (e.g., 'fr', 'en').
        custom_url: Custom URL override, or None to auto-generate.
        is_post: True if this is a blog post, False for static pages.
        slug: URL slug for the page.
        translations: Dictionary of UI translations for the current language.
        site_config: Site-wide configuration dictionary.
        projects: Project data for portfolio pages.
        jinja_env: Configured Jinja2 Environment instance.
        content_translations: Optional mapping of language codes to translated URLs.
        pagination: Optional pagination data for list pages.

    Returns:
        Rendered HTML string.

    Raises:
        jinja2.TemplateNotFound: If the specified template doesn't exist.
    """
    # Import here to avoid circular imports
    from core.content_processor import ContentProcessor
    from core.metadata_processor import MetadataProcessor

    # Process content
    processor = ContentProcessor()
    processed = processor.parse(content)

    # Process metadata
    meta_processor = MetadataProcessor()
    metadata = meta_processor.process(processed.metadata)

    # Determine the page URL based on type
    page_url: str
    languages = site_config.get("languages", [])
    is_unilingual = site_config.get("unilingual") or len(languages) <= 1
    if is_post:
        effective_slug = slug if slug is not None else metadata.get("slug", "post")
        post_base = site_config.get("post_base_url")
        if post_base is None:
            post_base = site_config.get("blog_url", "blog")
        post_base = str(post_base).strip("/")
        segments = []
        if not is_unilingual:
            segments.append(lang)
        if post_base:
            segments.append(post_base)
        segments.append(effective_slug)
        page_url = "/" + "/".join(segments) if segments else "/"
    elif custom_url is not None:
        page_url = custom_url
    else:
        page_url = "/" if is_unilingual else f"/{lang}/"

    # Build page context
    page_context = meta_processor.build_page_context(
        metadata=metadata,
        lang=lang,
        url=page_url,
        content_translations=content_translations,
        pagination=pagination,
    )

    # Render with Jinja
    template = jinja_env.get_template(template_name)
    return template.render(
        content=processed.html,
        page=page_context,
        t=translations,
        site=site_config,
        projects=projects,
    )


def format_date_filter(
    value: Union[str, datetime, date],
    fmt: str = DEFAULT_DATE_FORMAT,
    lang: str = DEFAULT_LOCALE,
) -> str:
    """
    Format a date using Babel for internationalization.

    Args:
        value: Date to format. Can be a string in 'YYYY-MM-DD' format,
               a datetime object, or a date object.
        fmt: Format style ('full', 'long', 'medium', 'short').
             Defaults to 'long'.
        lang: Locale code for formatting (e.g., 'fr_FR', 'en_US').
              Defaults to 'fr_FR'.

    Returns:
        Formatted date string in the specified locale.

    Raises:
        ValueError: If the value is not a recognized date type.

    Examples:
        >>> from datetime import date
        >>> format_date_filter("2025-11-25", "long", "fr_FR")
        '25 novembre 2025'

        >>> format_date_filter(date(2025, 11, 25), "short", "en_US")
        '11/25/25'
    """
    dt: date
    if isinstance(value, str):
        dt = datetime.strptime(value, "%Y-%m-%d").date()
    elif isinstance(value, datetime):
        dt = value.date()
    elif isinstance(value, date):
        dt = value
    else:
        raise ValueError(f"Unrecognized date type: {type(value)}")

    pattern = DATE_FORMAT_PATTERNS.get(fmt, DATE_FORMAT_PATTERNS[DEFAULT_DATE_FORMAT])
    return format_date(dt, format=pattern, locale=lang)


def slugify(value: str) -> str:
    """
    Convert a string to a URL-friendly slug.

    Performs the following transformations:
    1. Strips whitespace and converts to lowercase
    2. Transliterates Unicode characters to ASCII (é → e, ñ → n)
    3. Removes non-alphanumeric characters (except hyphens)
    4. Replaces spaces with hyphens
    5. Removes leading/trailing hyphens

    Args:
        value: String to convert to a slug.

    Returns:
        URL-friendly slug string.

    Examples:
        >>> slugify("Hello World!")
        'hello-world'

        >>> slugify("Café résumé")
        'cafe-resume'

        >>> slugify("mot-clé1")
        'mot-cle1'
    """
    value = str(value).strip().lower()
    value = unidecode(value)
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[-\s]+", "-", value).strip("-")
    return value
