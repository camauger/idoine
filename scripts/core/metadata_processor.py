"""
Metadata processing for the IDOINE static site generator.

Handles normalization, validation, and enrichment of
content metadata.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from utils.utils import slugify


class MetadataProcessor:
    """
    Processes and normalizes content metadata.

    Handles metadata extraction, normalization of list fields,
    and enrichment with computed values.
    """

    # Fields that should always be lists
    LIST_FIELDS = ["categories", "meta_keywords", "tags"]

    def __init__(self, default_values: Optional[Dict[str, Any]] = None):
        """
        Initialize the MetadataProcessor.

        Args:
            default_values: Default values for missing metadata fields.
        """
        self.defaults = default_values or {}

    def process(
        self,
        metadata: Dict[str, Any],
        slug_source: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process and normalize metadata.

        Args:
            metadata: Raw metadata dictionary.
            slug_source: Fallback value for slug generation (e.g., filename).

        Returns:
            Processed metadata dictionary.
        """
        result = dict(metadata)

        # Apply defaults for missing fields
        for key, default in self.defaults.items():
            if key not in result:
                result[key] = default

        # Normalize list fields
        for field in self.LIST_FIELDS:
            result[field] = self._ensure_list(result.get(field))

        # Ensure slug exists
        if "slug" not in result or not result["slug"]:
            if slug_source:
                result["slug"] = slugify(slug_source)
            elif result.get("title"):
                result["slug"] = slugify(result["title"])

        # Normalize date
        if "date" in result:
            result["date"] = self._normalize_date(result["date"])

        return result

    def build_page_context(
        self,
        metadata: Dict[str, Any],
        lang: str,
        url: str,
        content_translations: Optional[Dict[str, str]] = None,
        pagination: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Build the page context for template rendering.

        Args:
            metadata: Processed metadata dictionary.
            lang: Language code.
            url: Page URL.
            content_translations: Mapping of language codes to URLs.
            pagination: Pagination data for list pages.

        Returns:
            Complete page context dictionary.
        """
        context = {
            "lang": lang,
            "url": url,
            "content_translations": content_translations or {},
            "pagination": pagination or {"posts": []},
            **metadata,
        }
        return context

    def _ensure_list(self, value: Any) -> List[str]:
        """
        Ensure a value is a list of strings.

        Args:
            value: Value to convert to list.

        Returns:
            List of strings.
        """
        if value is None:
            return []
        if isinstance(value, (list, tuple)):
            return [str(v).strip() for v in value if str(v).strip()]
        if isinstance(value, str):
            # Handle comma-separated strings
            return [v.strip() for v in value.split(",") if v.strip()]
        return [str(value)]

    def _normalize_date(self, value: Any) -> Optional[str]:
        """
        Normalize a date value to ISO format string.

        Args:
            value: Date value (string, date, or datetime).

        Returns:
            ISO format date string or None.
        """
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d")
        if isinstance(value, date):
            return value.strftime("%Y-%m-%d")
        if isinstance(value, str):
            return value.strip() or None
        return str(value)

    def extract_translation_id(
        self,
        metadata: Dict[str, Any],
        fallback: str,
    ) -> str:
        """
        Extract translation ID from metadata.

        Args:
            metadata: Metadata dictionary.
            fallback: Fallback value if translation_id not found.

        Returns:
            Translation ID string.
        """
        return str(metadata.get("translation_id", fallback))

    def get_template_name(
        self,
        metadata: Dict[str, Any],
        default: str = "pages/home.html",
    ) -> str:
        """
        Get template name from metadata.

        Args:
            metadata: Metadata dictionary.
            default: Default template if not specified.

        Returns:
            Template name string.
        """
        return metadata.get("template", default)
