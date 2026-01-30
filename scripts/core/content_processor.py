"""
Content processing for the IDOINE static site generator.

Handles parsing of Markdown content with frontmatter and
conversion to HTML.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import frontmatter
import markdown


@dataclass
class ProcessedContent:
    """Container for processed content data."""

    metadata: Dict[str, Any]
    markdown: str
    html: str


class ContentProcessor:
    """
    Processes Markdown content with frontmatter.

    Separates content parsing from template rendering and URL generation.
    """

    def __init__(self, markdown_extensions: Optional[List[str]] = None) -> None:
        """
        Initialize the ContentProcessor.

        Args:
            markdown_extensions: List of markdown extensions to use.
                                 Default: ["meta"]
        """
        self.extensions = markdown_extensions or ["meta"]

    def parse(self, content: str) -> ProcessedContent:
        """
        Parse raw content into metadata, markdown, and HTML.

        Args:
            content: Raw content string with optional frontmatter.

        Returns:
            ProcessedContent with metadata, markdown, and HTML.
        """
        parsed = frontmatter.loads(content)
        metadata = dict(parsed.metadata or {})
        md_content = parsed.content
        html_content = self.markdown_to_html(md_content)

        return ProcessedContent(
            metadata=metadata,
            markdown=md_content,
            html=html_content,
        )

    def markdown_to_html(self, text: str) -> str:
        """
        Convert Markdown text to HTML.

        Args:
            text: Markdown formatted string.

        Returns:
            HTML string.
        """
        return markdown.markdown(text, extensions=self.extensions)

    def extract_metadata(self, content: str) -> Dict[str, Any]:
        """
        Extract only metadata from content without full processing.

        Args:
            content: Raw content string with frontmatter.

        Returns:
            Metadata dictionary.
        """
        parsed = frontmatter.loads(content)
        return dict(parsed.metadata or {})
