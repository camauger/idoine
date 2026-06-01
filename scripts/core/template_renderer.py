"""
Template rendering for the IDOINE static site generator.

Handles Jinja2 template rendering with proper context setup.
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional

from jinja2 import Environment, TemplateNotFound

logger = logging.getLogger(__name__)


class TemplateRenderer:
    """
    Renders Jinja2 templates with content and context.

    Provides a clean interface for template rendering with
    proper error handling and context management.
    """

    def __init__(
        self,
        jinja_env: Environment,
        site_config: Dict[str, Any],
        translations: Dict[str, Dict[str, Any]],
        projects: Any = None,
    ):
        """
        Initialize the TemplateRenderer.

        Args:
            jinja_env: Configured Jinja2 Environment.
            site_config: Site configuration dictionary.
            translations: Translations dictionary keyed by language.
            projects: Optional project data for portfolio pages.
        """
        self.jinja_env = jinja_env
        self.site_config = site_config
        self.translations = translations
        self.projects = projects or {}

    def render(
        self,
        template_name: str,
        content: str,
        page_context: Dict[str, Any],
        lang: str,
        extra_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Render a template with the given context.

        Args:
            template_name: Name of the template to render.
            content: HTML content to include in the template.
            page_context: Page-specific context dictionary.
            lang: Language code for translations.
            extra_context: Additional context variables.

        Returns:
            Rendered HTML string.

        Raises:
            TemplateNotFound: If the template doesn't exist.
        """
        try:
            template = self.jinja_env.get_template(template_name)
        except TemplateNotFound:
            logger.error(f"Template not found: {template_name}")
            raise

        # Build full context
        context = {
            "content": content,
            "page": page_context,
            "t": self.translations.get(lang, {}),
            "site": self.site_config,
            "projects": self.projects,
        }

        # Merge extra context
        if extra_context:
            context.update(extra_context)

        return template.render(**context)

    def render_to_file(
        self,
        template_name: str,
        content: str,
        page_context: Dict[str, Any],
        lang: str,
        output_path: Path,
        extra_context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Render a template and write to a file.

        Args:
            template_name: Name of the template to render.
            content: HTML content to include.
            page_context: Page-specific context dictionary.
            lang: Language code for translations.
            output_path: Path to write the rendered output.
            extra_context: Additional context variables.
        """
        rendered = self.render(
            template_name=template_name,
            content=content,
            page_context=page_context,
            lang=lang,
            extra_context=extra_context,
        )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered, encoding="utf-8")
        logger.debug(f"Rendered: {output_path}")

    def render_page(
        self,
        template_name: str,
        html_content: str,
        metadata: Dict[str, Any],
        lang: str,
        url: str,
        content_translations: Optional[Dict[str, str]] = None,
        pagination: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Convenience method to render a standard page.

        Args:
            template_name: Template to use.
            html_content: Converted HTML content.
            metadata: Page metadata dictionary.
            lang: Language code.
            url: Page URL.
            content_translations: Translation URLs.
            pagination: Pagination data.

        Returns:
            Rendered HTML string.
        """
        page_context = {
            "lang": lang,
            "url": url,
            "content_translations": content_translations or {},
            "pagination": pagination or {"posts": []},
            **metadata,
        }

        return self.render(
            template_name=template_name,
            content=html_content,
            page_context=page_context,
            lang=lang,
        )
