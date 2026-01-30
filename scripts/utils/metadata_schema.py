"""
Pydantic schemas for validating frontmatter metadata.

Provides structured validation for content metadata to ensure
data integrity and catch errors early in the build process.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator


class ContentMetadata(BaseModel):
    """
    Schema for validating content file frontmatter.

    Validates common metadata fields found in Markdown frontmatter
    including title, date, categories, and more.
    """

    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[Union[str, date, datetime]] = None
    author: Optional[str] = None
    slug: Optional[str] = None
    translation_id: Optional[str] = None
    summary: Optional[str] = None
    categories: List[str] = Field(default_factory=list)
    meta_keywords: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    thumbnail: Optional[str] = None
    template: Optional[str] = None

    # Allow extra fields for flexibility
    model_config = {"extra": "allow"}

    @field_validator("date", mode="before")
    @classmethod
    def validate_date_format(cls, v: Any) -> Optional[str]:
        """Validate and normalize date to YYYY-MM-DD string format."""
        if v is None or v == "":
            return None

        # Already a date/datetime object
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d")
        if isinstance(v, date):
            return v.strftime("%Y-%m-%d")

        # String format validation
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
            # Try parsing YYYY-MM-DD format
            try:
                parts = [int(p) for p in v.split("-")]
                if len(parts) == 3:
                    date(parts[0], parts[1], parts[2])
                    return v
            except (ValueError, AssertionError):
                pass
            raise ValueError(f"date must be in YYYY-MM-DD format, got: {v}")

        return str(v)

    @field_validator("slug", mode="before")
    @classmethod
    def validate_slug(cls, v: Any) -> Optional[str]:
        """Validate slug is URL-safe."""
        if v is None or v == "":
            return None

        v = str(v).strip()
        if not v:
            return None

        # Check for valid slug characters (alphanumeric, hyphens, underscores)
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                f"slug must contain only letters, numbers, hyphens, and underscores: {v}"
            )

        return v

    @field_validator("template", mode="before")
    @classmethod
    def validate_template(cls, v: Any) -> Optional[str]:
        """Validate template path format."""
        if v is None or v == "":
            return None

        v = str(v).strip()
        if not v:
            return None

        # Basic path traversal prevention
        if ".." in v:
            raise ValueError(f"template path cannot contain '..': {v}")

        # Must end with .html or similar
        if not v.endswith((".html", ".jinja2", ".j2")):
            raise ValueError(f"template must be an HTML file: {v}")

        return v

    @field_validator("thumbnail", mode="before")
    @classmethod
    def validate_thumbnail(cls, v: Any) -> Optional[str]:
        """Validate thumbnail path format."""
        if v is None or v == "":
            return None

        v = str(v).strip()
        if not v:
            return None

        # Basic path traversal prevention
        if ".." in v:
            raise ValueError(f"thumbnail path cannot contain '..': {v}")

        return v

    @field_validator("categories", "meta_keywords", "tags", mode="before")
    @classmethod
    def ensure_list(cls, v: Any) -> List[str]:
        """Ensure value is a list of strings."""
        if v is None:
            return []
        if isinstance(v, str):
            # Handle comma-separated strings
            return [item.strip() for item in v.split(",") if item.strip()]
        if isinstance(v, (list, tuple)):
            return [str(item).strip() for item in v if str(item).strip()]
        return [str(v)]


class PostMetadata(ContentMetadata):
    """Extended schema for blog post metadata."""

    # Posts should have required fields
    @model_validator(mode="after")
    def validate_post_requirements(self) -> "PostMetadata":
        """Validate that posts have minimum required fields."""
        # Title is recommended but not strictly required
        # Date is important for posts
        return self


class GlossaryTermMetadata(ContentMetadata):
    """Schema for glossary term metadata."""

    # Glossary terms might have different requirements
    pass


class PageMetadata(ContentMetadata):
    """Schema for static page metadata."""

    # Pages might have different requirements
    pass


def validate_metadata(
    metadata: Dict[str, Any],
    schema_class: type = ContentMetadata,
    strict: bool = False,
) -> Dict[str, Any]:
    """
    Validate metadata dictionary against a schema.

    Args:
        metadata: Raw metadata dictionary from frontmatter.
        schema_class: Pydantic model class to use for validation.
        strict: If True, raise on validation errors. If False, log and return original.

    Returns:
        Validated and normalized metadata dictionary.

    Raises:
        ValueError: If strict=True and validation fails.
    """
    try:
        validated = schema_class.model_validate(metadata)
        return validated.model_dump(exclude_none=False)
    except Exception as e:
        if strict:
            raise ValueError(f"Metadata validation failed: {e}")
        # In non-strict mode, return original with normalized list fields
        result = dict(metadata)
        for key in ["categories", "meta_keywords", "tags"]:
            if key not in result:
                result[key] = []
            elif not isinstance(result[key], list):
                val = result[key]
                if isinstance(val, str):
                    result[key] = [v.strip() for v in val.split(",") if v.strip()]
                else:
                    result[key] = [str(val)] if val else []
        return result
