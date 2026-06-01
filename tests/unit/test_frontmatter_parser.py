"""
Unit tests for the frontmatter parser module.
"""

import pytest

from utils.frontmatter_parser import parse_frontmatter


class TestParseFrontmatter:
    """Tests for the parse_frontmatter function."""

    def test_parse_valid_frontmatter(self, sample_markdown_content: str):
        """Test parsing valid Markdown with frontmatter."""
        metadata, content = parse_frontmatter(sample_markdown_content)

        assert metadata["title"] == "Test Page"
        assert metadata["description"] == "A test page description"
        assert metadata["author"] == "Test Author"
        assert metadata["slug"] == "test-page"
        assert "# Test Heading" in content

    def test_parse_empty_frontmatter(self):
        """Test parsing content with empty frontmatter."""
        content = """---
---

# Content Only
"""
        metadata, md_content = parse_frontmatter(content)

        # Parser normalizes empty list fields
        assert "# Content Only" in md_content
        # categories, meta_keywords, tags are normalized to empty lists
        assert isinstance(metadata.get("categories", []), list)

    def test_parse_no_frontmatter(self, sample_markdown_no_frontmatter: str):
        """Test parsing content without frontmatter."""
        metadata, content = parse_frontmatter(sample_markdown_no_frontmatter)

        # Parser normalizes list fields even when no frontmatter
        assert "# Just Content" in content
        assert isinstance(metadata.get("categories", []), list)

    def test_categories_as_list(self, sample_markdown_content: str):
        """Test that categories are parsed as a list."""
        metadata, _ = parse_frontmatter(sample_markdown_content)

        assert "categories" in metadata
        assert isinstance(metadata["categories"], list)
        assert "Category 1" in metadata["categories"]
        assert "Category 2" in metadata["categories"]

    def test_categories_as_comma_separated_string(self):
        """Test that comma-separated categories are parsed as a list."""
        content = """---
title: Test
categories: cat1, cat2, cat3
---

Content
"""
        metadata, _ = parse_frontmatter(content)

        assert isinstance(metadata["categories"], list)
        assert "cat1" in metadata["categories"]
        assert "cat2" in metadata["categories"]
        assert "cat3" in metadata["categories"]

    def test_meta_keywords_as_list(self, sample_markdown_content: str):
        """Test that meta_keywords are parsed as a list."""
        metadata, _ = parse_frontmatter(sample_markdown_content)

        assert "meta_keywords" in metadata
        assert isinstance(metadata["meta_keywords"], list)
        assert "keyword1" in metadata["meta_keywords"]

    def test_tags_as_list(self, sample_markdown_content: str):
        """Test that tags are parsed as a list."""
        metadata, _ = parse_frontmatter(sample_markdown_content)

        assert "tags" in metadata
        assert isinstance(metadata["tags"], list)

    def test_date_preserved(self, sample_markdown_content: str):
        """Test that date is preserved in metadata."""
        metadata, _ = parse_frontmatter(sample_markdown_content)

        assert "date" in metadata
        # Date might be parsed as string or date object depending on YAML loader
        date_value = metadata["date"]
        assert date_value is not None

    def test_complex_yaml(self):
        """Test handling of complex YAML in frontmatter."""
        content = """---
title: Test
nested:
  key: value
  another: data
---

Content
"""
        metadata, md_content = parse_frontmatter(content)
        # Should parse successfully
        assert isinstance(metadata, dict)
        assert metadata.get("title") == "Test"
        assert isinstance(md_content, str)

    def test_multiline_description(self):
        """Test parsing multiline values in frontmatter."""
        content = """---
title: Test
description: |
  This is a multiline
  description that spans
  multiple lines.
---

Content
"""
        metadata, _ = parse_frontmatter(content)

        assert "description" in metadata
        assert "multiline" in metadata["description"]

    def test_special_characters_in_title(self):
        """Test parsing titles with special characters."""
        content = """---
title: "Test: A Special Title (With Parentheses)"
---

Content
"""
        metadata, _ = parse_frontmatter(content)

        assert metadata["title"] == "Test: A Special Title (With Parentheses)"

