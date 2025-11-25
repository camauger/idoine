"""
Frontmatter parsing utilities for Markdown files.

Parses YAML frontmatter from Markdown content and optionally
validates it against a pydantic schema.
"""

import logging
from typing import Any, Dict, Optional, Tuple, Type

import frontmatter

from .metadata_schema import ContentMetadata, validate_metadata

logger = logging.getLogger(__name__)


def _ensure_list(value: Any) -> list:
    """
    Normalize scalar or list-like metadata fields to a list of strings.

    Args:
        value: Value to normalize (can be None, string, list, etc.)

    Returns:
        List of trimmed strings.
    """
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [str(v).strip() for v in value if str(v).strip()]
    # Handle comma-separated strings
    text = str(value).strip()
    if not text:
        return []
    return [v.strip() for v in text.strip("[]").split(",") if v.strip()]


def parse_frontmatter(
    content: str,
    validate: bool = False,
    schema_class: Optional[Type[ContentMetadata]] = None,
    strict: bool = False,
) -> Tuple[Dict[str, Any], str]:
    """
    Parse frontmatter from Markdown content.

    Extracts YAML frontmatter from the beginning of Markdown content,
    normalizes list fields, and optionally validates against a schema.

    Args:
        content: Raw Markdown content with optional frontmatter.
        validate: If True, validate metadata against schema.
        schema_class: Pydantic model class for validation. Default: ContentMetadata.
        strict: If True and validation fails, return empty metadata.

    Returns:
        Tuple of (metadata dict, markdown content string).
        On error, returns ({}, content) to gracefully skip invalid files.

    Examples:
        >>> content = '''---
        ... title: My Post
        ... date: 2025-01-01
        ... ---
        ... # Hello World
        ... '''
        >>> metadata, md = parse_frontmatter(content)
        >>> metadata['title']
        'My Post'
    """
    try:
        parsed = frontmatter.loads(content)
        metadata = dict(parsed.metadata or {})

        # Normalize common list fields
        for key in ["categories", "meta_keywords", "tags"]:
            metadata[key] = _ensure_list(metadata.get(key))

        # Optional schema validation
        if validate:
            schema = schema_class or ContentMetadata
            metadata = validate_metadata(metadata, schema, strict=strict)

        return metadata, parsed.content

    except Exception as e:
        logger.error(f"Erreur lors du parsing du front matter: {e}")
        return {}, content


def parse_frontmatter_strict(
    content: str,
    schema_class: Optional[Type[ContentMetadata]] = None,
) -> Tuple[Dict[str, Any], str]:
    """
    Parse frontmatter with strict validation.

    Same as parse_frontmatter but with validation enabled and strict mode.
    Useful when you want to catch metadata errors early.

    Args:
        content: Raw Markdown content with optional frontmatter.
        schema_class: Pydantic model class for validation.

    Returns:
        Tuple of (validated metadata dict, markdown content string).

    Raises:
        ValueError: If metadata validation fails.
    """
    return parse_frontmatter(
        content,
        validate=True,
        schema_class=schema_class,
        strict=True,
    )
