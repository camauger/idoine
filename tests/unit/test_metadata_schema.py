"""
Unit tests for the metadata schema module.

Tests Pydantic schema validation for content metadata.
"""

from datetime import date, datetime

import pytest
from pydantic import ValidationError
from utils.metadata_schema import (
    ContentMetadata,
    GlossaryTermMetadata,
    PageMetadata,
    PostMetadata,
    validate_metadata,
)


class TestContentMetadata:
    """Tests for the ContentMetadata schema."""

    def test_create_minimal_metadata(self):
        """Test creating metadata with minimal fields."""
        metadata = ContentMetadata()
        assert metadata.title is None
        assert metadata.categories == []
        assert metadata.tags == []

    def test_create_full_metadata(self):
        """Test creating metadata with all fields."""
        metadata = ContentMetadata(
            title="Test Page",
            description="A test description",
            date="2025-11-25",
            author="John Doe",
            slug="test-page",
            translation_id="test-page-id",
            categories=["cat1", "cat2"],
            tags=["tag1", "tag2"],
            meta_keywords=["kw1", "kw2"],
            template="pages/custom.html",
            thumbnail="/images/thumb.jpg",
        )

        assert metadata.title == "Test Page"
        assert metadata.author == "John Doe"
        assert metadata.categories == ["cat1", "cat2"]

    def test_allows_extra_fields(self):
        """Test that extra fields are allowed."""
        metadata = ContentMetadata(
            title="Test",
            custom_field="custom value",
            another_field=123,
        )
        assert metadata.model_extra["custom_field"] == "custom value"


class TestDateValidation:
    """Tests for date field validation."""

    def test_valid_date_string(self):
        """Test valid date string format."""
        metadata = ContentMetadata(date="2025-11-25")
        assert metadata.date == "2025-11-25"

    def test_date_object_normalized(self):
        """Test date object is normalized to string."""
        metadata = ContentMetadata(date=date(2025, 11, 25))
        assert metadata.date == "2025-11-25"

    def test_datetime_object_normalized(self):
        """Test datetime object is normalized to string."""
        metadata = ContentMetadata(date=datetime(2025, 11, 25, 10, 30))
        assert metadata.date == "2025-11-25"

    def test_empty_date_becomes_none(self):
        """Test empty date string becomes None."""
        metadata = ContentMetadata(date="")
        assert metadata.date is None

    def test_none_date(self):
        """Test None date is preserved."""
        metadata = ContentMetadata(date=None)
        assert metadata.date is None

    def test_invalid_date_format_raises(self):
        """Test invalid date format raises ValidationError."""
        with pytest.raises(ValidationError):
            ContentMetadata(date="25/11/2025")

    def test_invalid_date_values_raise(self):
        """Test invalid date values raise ValidationError."""
        with pytest.raises(ValidationError):
            ContentMetadata(date="2025-13-45")


class TestSlugValidation:
    """Tests for slug field validation."""

    def test_valid_slug(self):
        """Test valid slug format."""
        metadata = ContentMetadata(slug="my-valid-slug")
        assert metadata.slug == "my-valid-slug"

    def test_slug_with_numbers(self):
        """Test slug with numbers."""
        metadata = ContentMetadata(slug="post-123")
        assert metadata.slug == "post-123"

    def test_slug_with_underscores(self):
        """Test slug with underscores."""
        metadata = ContentMetadata(slug="my_slug_here")
        assert metadata.slug == "my_slug_here"

    def test_empty_slug_becomes_none(self):
        """Test empty slug becomes None."""
        metadata = ContentMetadata(slug="")
        assert metadata.slug is None

    def test_invalid_slug_with_spaces_raises(self):
        """Test slug with spaces raises ValidationError."""
        with pytest.raises(ValidationError):
            ContentMetadata(slug="invalid slug")

    def test_invalid_slug_with_special_chars_raises(self):
        """Test slug with special characters raises ValidationError."""
        with pytest.raises(ValidationError):
            ContentMetadata(slug="slug@#$%")


class TestTemplateValidation:
    """Tests for template field validation."""

    def test_valid_html_template(self):
        """Test valid HTML template path."""
        metadata = ContentMetadata(template="pages/home.html")
        assert metadata.template == "pages/home.html"

    def test_valid_jinja2_template(self):
        """Test valid Jinja2 template path."""
        metadata = ContentMetadata(template="pages/home.jinja2")
        assert metadata.template == "pages/home.jinja2"

    def test_valid_j2_template(self):
        """Test valid .j2 template path."""
        metadata = ContentMetadata(template="pages/home.j2")
        assert metadata.template == "pages/home.j2"

    def test_empty_template_becomes_none(self):
        """Test empty template becomes None."""
        metadata = ContentMetadata(template="")
        assert metadata.template is None

    def test_template_with_path_traversal_raises(self):
        """Test template with path traversal raises ValidationError."""
        with pytest.raises(ValidationError):
            ContentMetadata(template="../secret/template.html")

    def test_template_without_html_extension_raises(self):
        """Test template without valid extension raises ValidationError."""
        with pytest.raises(ValidationError):
            ContentMetadata(template="pages/template.txt")


class TestThumbnailValidation:
    """Tests for thumbnail field validation."""

    def test_valid_thumbnail(self):
        """Test valid thumbnail path."""
        metadata = ContentMetadata(thumbnail="/images/thumb.jpg")
        assert metadata.thumbnail == "/images/thumb.jpg"

    def test_empty_thumbnail_becomes_none(self):
        """Test empty thumbnail becomes None."""
        metadata = ContentMetadata(thumbnail="")
        assert metadata.thumbnail is None

    def test_thumbnail_with_path_traversal_raises(self):
        """Test thumbnail with path traversal raises ValidationError."""
        with pytest.raises(ValidationError):
            ContentMetadata(thumbnail="../../../etc/passwd")


class TestListFieldNormalization:
    """Tests for list field normalization."""

    def test_list_preserved(self):
        """Test that lists are preserved."""
        metadata = ContentMetadata(categories=["a", "b", "c"])
        assert metadata.categories == ["a", "b", "c"]

    def test_comma_separated_string_split(self):
        """Test comma-separated string is split into list."""
        metadata = ContentMetadata(categories="cat1, cat2, cat3")
        assert metadata.categories == ["cat1", "cat2", "cat3"]

    def test_single_string_becomes_list(self):
        """Test single string becomes list."""
        metadata = ContentMetadata(categories="single")
        assert metadata.categories == ["single"]

    def test_none_becomes_empty_list(self):
        """Test None becomes empty list."""
        metadata = ContentMetadata(categories=None)
        assert metadata.categories == []

    def test_tuple_converted_to_list(self):
        """Test tuple is converted to list."""
        metadata = ContentMetadata(tags=("tag1", "tag2"))
        assert metadata.tags == ["tag1", "tag2"]

    def test_empty_strings_removed(self):
        """Test empty strings are removed from lists."""
        metadata = ContentMetadata(categories=["a", "", "b", "  ", "c"])
        assert metadata.categories == ["a", "b", "c"]

    def test_whitespace_stripped(self):
        """Test whitespace is stripped from list items."""
        metadata = ContentMetadata(tags=["  tag1  ", "  tag2  "])
        assert metadata.tags == ["tag1", "tag2"]


class TestPostMetadata:
    """Tests for the PostMetadata schema."""

    def test_create_post_metadata(self):
        """Test creating PostMetadata."""
        metadata = PostMetadata(
            title="Blog Post",
            date="2025-11-25",
            categories=["tech"],
        )
        assert metadata.title == "Blog Post"
        assert isinstance(metadata, ContentMetadata)

    def test_post_metadata_inherits_validation(self):
        """Test PostMetadata inherits parent validation."""
        with pytest.raises(ValidationError):
            PostMetadata(date="invalid-date")


class TestGlossaryTermMetadata:
    """Tests for the GlossaryTermMetadata schema."""

    def test_create_glossary_term_metadata(self):
        """Test creating GlossaryTermMetadata."""
        metadata = GlossaryTermMetadata(
            title="Algorithm",
            description="A step-by-step procedure",
            tags=["programming", "math"],
        )
        assert metadata.title == "Algorithm"
        assert isinstance(metadata, ContentMetadata)


class TestPageMetadata:
    """Tests for the PageMetadata schema."""

    def test_create_page_metadata(self):
        """Test creating PageMetadata."""
        metadata = PageMetadata(
            title="About Us",
            template="pages/about.html",
        )
        assert metadata.title == "About Us"
        assert isinstance(metadata, ContentMetadata)


class TestValidateMetadataFunction:
    """Tests for the validate_metadata function."""

    def test_validate_valid_metadata(self):
        """Test validating valid metadata."""
        raw = {
            "title": "Test",
            "date": "2025-11-25",
            "categories": ["cat1"],
        }
        result = validate_metadata(raw)

        assert result["title"] == "Test"
        assert result["categories"] == ["cat1"]

    def test_validate_with_custom_schema(self):
        """Test validating with custom schema class."""
        raw = {"title": "Post", "date": "2025-11-25"}
        result = validate_metadata(raw, schema_class=PostMetadata)

        assert result["title"] == "Post"

    def test_validate_strict_mode_raises(self):
        """Test strict mode raises on invalid data."""
        raw = {"date": "invalid-date"}

        with pytest.raises(ValueError):
            validate_metadata(raw, strict=True)

    def test_validate_non_strict_mode_returns_original(self):
        """Test non-strict mode returns normalized data on error."""
        raw = {"date": "invalid-date", "title": "Test"}
        result = validate_metadata(raw, strict=False)

        # Should return original with normalized list fields
        assert result["title"] == "Test"
        assert result["categories"] == []
        assert result["tags"] == []
        assert result["meta_keywords"] == []

    def test_validate_normalizes_list_fields_on_error(self):
        """Test that list fields are normalized even on validation error."""
        raw = {
            "date": "invalid",
            "categories": "cat1, cat2",
        }
        result = validate_metadata(raw, strict=False)

        assert result["categories"] == ["cat1", "cat2"]

    def test_validate_empty_metadata(self):
        """Test validating empty metadata."""
        result = validate_metadata({})

        assert result["categories"] == []
        assert result["tags"] == []
        assert result["title"] is None


class TestEdgeCases:
    """Tests for edge cases in metadata validation."""

    def test_unicode_in_title(self):
        """Test Unicode characters in title."""
        metadata = ContentMetadata(title="Café résumé éàü")
        assert metadata.title == "Café résumé éàü"

    def test_very_long_description(self):
        """Test very long description."""
        long_desc = "A" * 10000
        metadata = ContentMetadata(description=long_desc)
        assert len(metadata.description) == 10000

    def test_special_characters_in_description(self):
        """Test special characters in description."""
        metadata = ContentMetadata(
            description="Description with <html> & 'quotes' \"double\""
        )
        assert "<html>" in metadata.description

    def test_numeric_values_rejected(self):
        """Test numeric values are rejected for string fields."""
        # Pydantic requires proper types - int is not valid for string field
        with pytest.raises(ValidationError):
            ContentMetadata(title=123)
