"""
Unit tests for the utils module.
"""

from datetime import date, datetime

import pytest

from utils.utils import format_date_filter, markdown_filter, slugify


class TestSlugify:
    """Tests for the slugify function."""

    def test_basic_slugify(self):
        """Test basic string slugification."""
        assert slugify("Hello World") == "hello-world"

    def test_slugify_with_accents(self):
        """Test slugification of accented characters."""
        assert slugify("Café résumé") == "cafe-resume"
        assert slugify("naïve") == "naive"

    def test_slugify_preserves_numbers(self):
        """Test that numbers are preserved in slugs."""
        assert slugify("Test 123") == "test-123"
        assert slugify("mot-clé1") == "mot-cle1"

    def test_slugify_removes_special_chars(self):
        """Test removal of special characters."""
        assert slugify("Hello! World?") == "hello-world"
        assert slugify("Test@#$%") == "test"

    def test_slugify_handles_multiple_spaces(self):
        """Test handling of multiple spaces."""
        assert slugify("Hello    World") == "hello-world"

    def test_slugify_strips_leading_trailing_hyphens(self):
        """Test stripping of leading/trailing hyphens."""
        assert slugify("  Hello World  ") == "hello-world"
        assert slugify("-hello-world-") == "hello-world"

    def test_slugify_handles_empty_string(self):
        """Test handling of empty string."""
        assert slugify("") == ""

    def test_slugify_handles_unicode(self):
        """Test handling of various Unicode characters."""
        # Russian Cyrillic transliteration
        assert slugify("Москва") == "moskva"
        # Accented characters
        assert slugify("Zürich") == "zurich"
        # Greek letters
        result = slugify("Ελληνικά")
        assert result  # Should produce some output
        assert "-" not in result or len(result) > 1  # Valid slug

    def test_slugify_converts_to_lowercase(self):
        """Test that output is lowercase."""
        assert slugify("HELLO WORLD") == "hello-world"
        assert slugify("HeLLo WoRLd") == "hello-world"


class TestMarkdownFilter:
    """Tests for the markdown_filter function."""

    def test_basic_markdown(self):
        """Test basic Markdown conversion."""
        result = markdown_filter("**bold**")
        assert "<strong>bold</strong>" in result

    def test_heading_markdown(self):
        """Test heading conversion."""
        result = markdown_filter("# Heading 1")
        assert "<h1>Heading 1</h1>" in result

    def test_italic_markdown(self):
        """Test italic conversion."""
        result = markdown_filter("*italic*")
        assert "<em>italic</em>" in result

    def test_list_markdown(self):
        """Test list conversion."""
        result = markdown_filter("- item 1\n- item 2")
        assert "<li>item 1</li>" in result
        assert "<li>item 2</li>" in result

    def test_link_markdown(self):
        """Test link conversion."""
        result = markdown_filter("[link](https://example.com)")
        assert '<a href="https://example.com">link</a>' in result

    def test_code_markdown(self):
        """Test inline code conversion."""
        result = markdown_filter("`code`")
        assert "<code>code</code>" in result

    def test_empty_string(self):
        """Test empty string handling."""
        result = markdown_filter("")
        assert result == ""


class TestFormatDateFilter:
    """Tests for the format_date_filter function."""

    def test_format_date_string(self):
        """Test formatting a date string."""
        result = format_date_filter("2025-11-25", "long", "fr_FR")
        assert "25" in result
        assert "novembre" in result
        assert "2025" in result

    def test_format_date_object(self):
        """Test formatting a date object."""
        d = date(2025, 11, 25)
        result = format_date_filter(d, "long", "fr_FR")
        assert "25" in result
        assert "novembre" in result

    def test_format_datetime_object(self):
        """Test formatting a datetime object."""
        dt = datetime(2025, 11, 25, 10, 30, 0)
        result = format_date_filter(dt, "long", "fr_FR")
        assert "25" in result
        assert "novembre" in result

    def test_format_short(self):
        """Test short date format."""
        result = format_date_filter("2025-11-25", "short", "fr_FR")
        assert "25/11" in result or "11/25" in result

    def test_format_medium(self):
        """Test medium date format."""
        result = format_date_filter("2025-11-25", "medium", "fr_FR")
        assert "nov" in result.lower()

    def test_format_full(self):
        """Test full date format."""
        result = format_date_filter("2025-11-25", "full", "fr_FR")
        # Full format includes day of week
        assert "2025" in result

    def test_format_english_locale(self):
        """Test formatting with English locale."""
        result = format_date_filter("2025-11-25", "long", "en_US")
        assert "November" in result
        assert "25" in result
        assert "2025" in result

    def test_invalid_date_type_raises_error(self):
        """Test that invalid date type raises ValueError."""
        with pytest.raises(ValueError):
            format_date_filter(12345, "long", "fr_FR")

    def test_default_format(self):
        """Test default format parameter."""
        result = format_date_filter("2025-11-25")
        assert "25" in result

    def test_invalid_format_uses_default(self):
        """Test that invalid format falls back to default."""
        result = format_date_filter("2025-11-25", "invalid", "fr_FR")
        # Should not raise, should use default pattern
        assert "2025" in result

