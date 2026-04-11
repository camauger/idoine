"""
Unit tests for the content processor module.
"""

import pytest
from core.content_processor import ContentProcessor, ProcessedContent


class TestProcessedContent:
    """Tests for the ProcessedContent dataclass."""

    def test_create_processed_content(self):
        """Test creating a ProcessedContent instance."""
        content = ProcessedContent(
            metadata={"title": "Test"},
            markdown="# Test",
            html="<h1>Test</h1>",
        )
        assert content.metadata["title"] == "Test"
        assert content.markdown == "# Test"
        assert content.html == "<h1>Test</h1>"


class TestContentProcessor:
    """Tests for the ContentProcessor class."""

    @pytest.fixture
    def processor(self) -> ContentProcessor:
        """Create a ContentProcessor instance for testing."""
        return ContentProcessor()

    def test_parse_content_with_frontmatter(self, processor: ContentProcessor):
        """Test parsing content with frontmatter."""
        content = """---
title: Test Page
description: A test description
date: 2025-11-25
---

# Hello World

This is test content.
"""
        result = processor.parse(content)

        assert isinstance(result, ProcessedContent)
        assert result.metadata["title"] == "Test Page"
        assert result.metadata["description"] == "A test description"
        assert "# Hello World" in result.markdown
        assert "<h1>Hello World</h1>" in result.html

    def test_parse_content_without_frontmatter(self, processor: ContentProcessor):
        """Test parsing content without frontmatter."""
        content = """# Just Content

This is content without frontmatter.
"""
        result = processor.parse(content)

        assert result.metadata == {}
        assert "# Just Content" in result.markdown
        assert "<h1>Just Content</h1>" in result.html

    def test_parse_empty_frontmatter(self, processor: ContentProcessor):
        """Test parsing content with empty frontmatter."""
        content = """---
---

# Content
"""
        result = processor.parse(content)

        assert result.metadata == {}
        assert "# Content" in result.markdown

    def test_markdown_to_html_bold(self, processor: ContentProcessor):
        """Test Markdown to HTML conversion with bold text."""
        html = processor.markdown_to_html("**bold text**")
        assert "<strong>bold text</strong>" in html

    def test_markdown_to_html_italic(self, processor: ContentProcessor):
        """Test Markdown to HTML conversion with italic text."""
        html = processor.markdown_to_html("*italic text*")
        assert "<em>italic text</em>" in html

    def test_markdown_to_html_heading(self, processor: ContentProcessor):
        """Test Markdown to HTML conversion with headings."""
        html = processor.markdown_to_html("# Heading 1\n## Heading 2")
        assert "<h1>Heading 1</h1>" in html
        assert "<h2>Heading 2</h2>" in html

    def test_markdown_to_html_list(self, processor: ContentProcessor):
        """Test Markdown to HTML conversion with lists."""
        html = processor.markdown_to_html("- item 1\n- item 2")
        assert "<li>item 1</li>" in html
        assert "<li>item 2</li>" in html

    def test_markdown_to_html_link(self, processor: ContentProcessor):
        """Test Markdown to HTML conversion with links."""
        html = processor.markdown_to_html("[Link](https://example.com)")
        assert '<a href="https://example.com">Link</a>' in html

    def test_markdown_to_html_code(self, processor: ContentProcessor):
        """Test Markdown to HTML conversion with inline code."""
        html = processor.markdown_to_html("`code`")
        assert "<code>code</code>" in html

    def test_markdown_to_html_empty_string(self, processor: ContentProcessor):
        """Test Markdown to HTML conversion with empty string."""
        html = processor.markdown_to_html("")
        assert html == ""

    def test_extract_metadata(self, processor: ContentProcessor):
        """Test extracting only metadata without full processing."""
        content = """---
title: Test
author: John Doe
---

# Content
"""
        metadata = processor.extract_metadata(content)

        assert metadata["title"] == "Test"
        assert metadata["author"] == "John Doe"
        assert isinstance(metadata, dict)

    def test_extract_metadata_empty_frontmatter(self, processor: ContentProcessor):
        """Test extracting metadata from content without frontmatter."""
        content = "# No frontmatter"
        metadata = processor.extract_metadata(content)

        assert metadata == {}


class TestContentProcessorExtensions:
    """Tests for ContentProcessor with custom extensions."""

    def test_custom_extensions(self):
        """Test ContentProcessor with custom Markdown extensions."""
        processor = ContentProcessor(markdown_extensions=["meta", "tables"])
        assert "meta" in processor.extensions
        assert "tables" in processor.extensions

    def test_default_extensions(self):
        """Test ContentProcessor default extensions."""
        processor = ContentProcessor()
        assert "meta" in processor.extensions


class TestContentProcessorComplexContent:
    """Tests for ContentProcessor with complex content."""

    @pytest.fixture
    def processor(self) -> ContentProcessor:
        """Create a ContentProcessor instance for testing."""
        return ContentProcessor()

    def test_multiline_description(self, processor: ContentProcessor):
        """Test parsing multiline values in frontmatter."""
        content = """---
title: Test
description: |
  This is a multiline
  description value.
---

Content
"""
        result = processor.parse(content)
        assert "multiline" in result.metadata["description"]

    def test_nested_frontmatter(self, processor: ContentProcessor):
        """Test parsing nested YAML in frontmatter."""
        content = """---
title: Test
author:
  name: John Doe
  email: john@example.com
---

Content
"""
        result = processor.parse(content)
        assert result.metadata["author"]["name"] == "John Doe"

    def test_list_in_frontmatter(self, processor: ContentProcessor):
        """Test parsing lists in frontmatter."""
        content = """---
title: Test
categories:
  - Category 1
  - Category 2
tags:
  - tag1
  - tag2
---

Content
"""
        result = processor.parse(content)
        assert isinstance(result.metadata["categories"], list)
        assert "Category 1" in result.metadata["categories"]
        assert "tag1" in result.metadata["tags"]

    def test_special_characters_in_content(self, processor: ContentProcessor):
        """Test parsing content with special characters."""
        content = """---
title: "Test: A Title With Colons"
---

# Content with émojis 🎉 and accénts
"""
        result = processor.parse(content)
        assert result.metadata["title"] == "Test: A Title With Colons"
        assert "émojis" in result.markdown
