"""
Unit tests for the metadata processor module.
"""

from datetime import date, datetime

import pytest
from core.metadata_processor import MetadataProcessor


class TestMetadataProcessor:
    """Tests for the MetadataProcessor class."""

    @pytest.fixture
    def processor(self) -> MetadataProcessor:
        """Create a MetadataProcessor instance for testing."""
        return MetadataProcessor()

    def test_process_basic_metadata(self, processor: MetadataProcessor):
        """Test processing basic metadata."""
        metadata = {
            "title": "Test Post",
            "description": "A test description",
        }
        result = processor.process(metadata)

        assert result["title"] == "Test Post"
        assert result["description"] == "A test description"

    def test_normalize_list_fields_from_list(self, processor: MetadataProcessor):
        """Test normalizing list fields that are already lists."""
        metadata = {
            "categories": ["Cat 1", "Cat 2"],
            "tags": ["tag1", "tag2"],
            "meta_keywords": ["kw1", "kw2"],
        }
        result = processor.process(metadata)

        assert result["categories"] == ["Cat 1", "Cat 2"]
        assert result["tags"] == ["tag1", "tag2"]
        assert result["meta_keywords"] == ["kw1", "kw2"]

    def test_normalize_list_fields_from_string(self, processor: MetadataProcessor):
        """Test normalizing list fields from comma-separated strings."""
        metadata = {
            "categories": "cat1, cat2, cat3",
            "tags": "tag1,tag2",
        }
        result = processor.process(metadata)

        assert result["categories"] == ["cat1", "cat2", "cat3"]
        assert result["tags"] == ["tag1", "tag2"]

    def test_normalize_list_fields_from_none(self, processor: MetadataProcessor):
        """Test normalizing list fields from None values."""
        metadata = {}
        result = processor.process(metadata)

        assert result["categories"] == []
        assert result["tags"] == []
        assert result["meta_keywords"] == []

    def test_generate_slug_from_title(self, processor: MetadataProcessor):
        """Test generating slug from title when not provided."""
        metadata = {"title": "Mon Article de Test"}
        result = processor.process(metadata)

        assert result["slug"] == "mon-article-de-test"

    def test_generate_slug_from_source(self, processor: MetadataProcessor):
        """Test generating slug from slug_source parameter."""
        metadata = {"title": "Title"}
        result = processor.process(metadata, slug_source="custom-slug-source")

        assert result["slug"] == "custom-slug-source"

    def test_preserve_existing_slug(self, processor: MetadataProcessor):
        """Test that existing slug is preserved."""
        metadata = {
            "title": "Title",
            "slug": "my-custom-slug",
        }
        result = processor.process(metadata)

        assert result["slug"] == "my-custom-slug"

    def test_normalize_date_from_string(self, processor: MetadataProcessor):
        """Test normalizing date from string."""
        metadata = {"date": "2025-11-25"}
        result = processor.process(metadata)

        assert result["date"] == "2025-11-25"

    def test_normalize_date_from_date_object(self, processor: MetadataProcessor):
        """Test normalizing date from date object."""
        metadata = {"date": date(2025, 11, 25)}
        result = processor.process(metadata)

        assert result["date"] == "2025-11-25"

    def test_normalize_date_from_datetime_object(self, processor: MetadataProcessor):
        """Test normalizing date from datetime object."""
        metadata = {"date": datetime(2025, 11, 25, 10, 30, 0)}
        result = processor.process(metadata)

        assert result["date"] == "2025-11-25"

    def test_normalize_date_none(self, processor: MetadataProcessor):
        """Test normalizing None date."""
        metadata = {"date": None}
        result = processor.process(metadata)

        assert result["date"] is None

    def test_normalize_date_empty_string(self, processor: MetadataProcessor):
        """Test normalizing empty string date."""
        metadata = {"date": "   "}
        result = processor.process(metadata)

        assert result["date"] is None


class TestMetadataProcessorDefaults:
    """Tests for MetadataProcessor with default values."""

    def test_apply_defaults(self):
        """Test applying default values for missing fields."""
        defaults = {
            "author": "Default Author",
            "template": "posts/post.html",
        }
        processor = MetadataProcessor(default_values=defaults)

        metadata = {"title": "Test"}
        result = processor.process(metadata)

        assert result["author"] == "Default Author"
        assert result["template"] == "posts/post.html"

    def test_defaults_dont_override_existing(self):
        """Test that defaults don't override existing values."""
        defaults = {"author": "Default Author"}
        processor = MetadataProcessor(default_values=defaults)

        metadata = {"title": "Test", "author": "Custom Author"}
        result = processor.process(metadata)

        assert result["author"] == "Custom Author"


class TestBuildPageContext:
    """Tests for the build_page_context method."""

    @pytest.fixture
    def processor(self) -> MetadataProcessor:
        """Create a MetadataProcessor instance for testing."""
        return MetadataProcessor()

    def test_build_basic_context(self, processor: MetadataProcessor):
        """Test building basic page context."""
        metadata = {"title": "Test Page"}
        context = processor.build_page_context(
            metadata=metadata,
            lang="fr",
            url="/fr/test-page",
        )

        assert context["lang"] == "fr"
        assert context["url"] == "/fr/test-page"
        assert context["title"] == "Test Page"

    def test_build_context_with_translations(self, processor: MetadataProcessor):
        """Test building context with content translations."""
        metadata = {"title": "Test Page"}
        translations = {"fr": "/fr/test-page", "en": "/en/test-page"}
        context = processor.build_page_context(
            metadata=metadata,
            lang="fr",
            url="/fr/test-page",
            content_translations=translations,
        )

        assert context["content_translations"]["fr"] == "/fr/test-page"
        assert context["content_translations"]["en"] == "/en/test-page"

    def test_build_context_with_pagination(self, processor: MetadataProcessor):
        """Test building context with pagination data."""
        metadata = {"title": "Blog"}
        pagination = {
            "posts": [{"title": "Post 1"}, {"title": "Post 2"}],
            "current_page": 1,
            "total_pages": 3,
        }
        context = processor.build_page_context(
            metadata=metadata,
            lang="fr",
            url="/fr/blog",
            pagination=pagination,
        )

        assert len(context["pagination"]["posts"]) == 2
        assert context["pagination"]["current_page"] == 1

    def test_build_context_default_values(self, processor: MetadataProcessor):
        """Test that context has default values."""
        metadata = {"title": "Test"}
        context = processor.build_page_context(
            metadata=metadata,
            lang="fr",
            url="/fr/test",
        )

        assert context["content_translations"] == {}
        assert context["pagination"] == {"posts": []}


class TestTranslationIdExtraction:
    """Tests for the extract_translation_id method."""

    @pytest.fixture
    def processor(self) -> MetadataProcessor:
        """Create a MetadataProcessor instance for testing."""
        return MetadataProcessor()

    def test_extract_existing_translation_id(self, processor: MetadataProcessor):
        """Test extracting existing translation_id."""
        metadata = {"translation_id": "my-translation-id"}
        result = processor.extract_translation_id(metadata, fallback="fallback")

        assert result == "my-translation-id"

    def test_extract_fallback_when_no_translation_id(
        self, processor: MetadataProcessor
    ):
        """Test using fallback when translation_id is missing."""
        metadata = {"title": "Test"}
        result = processor.extract_translation_id(metadata, fallback="fallback-slug")

        assert result == "fallback-slug"


class TestGetTemplateName:
    """Tests for the get_template_name method."""

    @pytest.fixture
    def processor(self) -> MetadataProcessor:
        """Create a MetadataProcessor instance for testing."""
        return MetadataProcessor()

    def test_get_existing_template(self, processor: MetadataProcessor):
        """Test getting existing template from metadata."""
        metadata = {"template": "posts/custom.html"}
        result = processor.get_template_name(metadata)

        assert result == "posts/custom.html"

    def test_get_default_template(self, processor: MetadataProcessor):
        """Test getting default template when not specified."""
        metadata = {"title": "Test"}
        result = processor.get_template_name(metadata)

        assert result == "pages/home.html"

    def test_get_custom_default_template(self, processor: MetadataProcessor):
        """Test getting custom default template."""
        metadata = {"title": "Test"}
        result = processor.get_template_name(metadata, default="posts/post.html")

        assert result == "posts/post.html"


class TestEnsureList:
    """Tests for the _ensure_list method."""

    @pytest.fixture
    def processor(self) -> MetadataProcessor:
        """Create a MetadataProcessor instance for testing."""
        return MetadataProcessor()

    def test_ensure_list_from_none(self, processor: MetadataProcessor):
        """Test _ensure_list with None."""
        result = processor._ensure_list(None)
        assert result == []

    def test_ensure_list_from_list(self, processor: MetadataProcessor):
        """Test _ensure_list with list."""
        result = processor._ensure_list(["a", "b"])
        assert result == ["a", "b"]

    def test_ensure_list_from_tuple(self, processor: MetadataProcessor):
        """Test _ensure_list with tuple."""
        result = processor._ensure_list(("a", "b"))
        assert result == ["a", "b"]

    def test_ensure_list_from_string(self, processor: MetadataProcessor):
        """Test _ensure_list with comma-separated string."""
        result = processor._ensure_list("a, b, c")
        assert result == ["a", "b", "c"]

    def test_ensure_list_strips_whitespace(self, processor: MetadataProcessor):
        """Test _ensure_list strips whitespace."""
        result = processor._ensure_list(["  a  ", "  b  "])
        assert result == ["a", "b"]

    def test_ensure_list_removes_empty_strings(self, processor: MetadataProcessor):
        """Test _ensure_list removes empty strings."""
        result = processor._ensure_list(["a", "", "b", "   "])
        assert result == ["a", "b"]

    def test_ensure_list_from_single_value(self, processor: MetadataProcessor):
        """Test _ensure_list with single non-list value."""
        result = processor._ensure_list(123)
        assert result == ["123"]
