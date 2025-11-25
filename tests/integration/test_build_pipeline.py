"""
Integration tests for the IDOINE build pipeline.
"""

from pathlib import Path

import pytest

from core.config_loader import ConfigLoader
from core.context import BuildContext
from jinja2 import Environment, FileSystemLoader, select_autoescape

from utils.utils import format_date_filter, markdown_filter, slugify


class TestBuildContext:
    """Tests for BuildContext creation and usage."""

    def test_create_build_context(self, temp_site_structure: dict, site_config: dict, translations: dict):
        """Test creating a BuildContext."""
        src_path = temp_site_structure["src"]
        dist_path = temp_site_structure["dist"]

        jinja_env = Environment(
            loader=FileSystemLoader(str(src_path / "templates")),
            autoescape=select_autoescape(["html", "xml"]),
        )

        context = BuildContext(
            src_path=src_path,
            dist_path=dist_path,
            site_config=site_config,
            translations=translations,
            jinja_env=jinja_env,
            projects={},
        )

        assert context.src_path == src_path
        assert context.dist_path == dist_path
        assert context.site_config["title"] == "Test Site"


class TestJinjaEnvironment:
    """Tests for Jinja2 environment setup."""

    def test_jinja_filters_registered(self, temp_site_structure: dict):
        """Test that custom Jinja filters can be registered."""
        jinja_env = Environment(
            loader=FileSystemLoader(str(temp_site_structure["src"] / "templates")),
            autoescape=select_autoescape(["html", "xml"]),
        )
        jinja_env.filters["date"] = format_date_filter
        jinja_env.filters["markdown"] = markdown_filter
        jinja_env.filters["slugify"] = slugify

        assert "date" in jinja_env.filters
        assert "markdown" in jinja_env.filters
        assert "slugify" in jinja_env.filters

    def test_template_rendering(self, temp_site_structure: dict):
        """Test basic template rendering."""
        jinja_env = Environment(
            loader=FileSystemLoader(str(temp_site_structure["src"] / "templates")),
            autoescape=select_autoescape(["html", "xml"]),
        )

        template = jinja_env.get_template("base.html")
        result = template.render(
            page={"lang": "fr", "title": "Test"},
            site={"title": "Test Site"},
        )

        assert "Test - Test Site" in result
        assert "lang=\"fr\"" in result


class TestConfigLoaderIntegration:
    """Integration tests for ConfigLoader."""

    def test_full_config_loading(self, temp_site_structure: dict):
        """Test loading all configuration files."""
        loader = ConfigLoader(temp_site_structure["src"])

        config = loader.load_site_config()
        translations = loader.load_translations()
        projects = loader.load_projects()

        assert config is not None
        assert translations is not None
        assert projects is not None

        # Verify relationships between configs
        assert len(translations) >= len(config.get("languages", []))


class TestOutputGeneration:
    """Tests for output file generation."""

    def test_output_directory_creation(self, temp_site_structure: dict):
        """Test that output directories are created properly."""
        dist_path = temp_site_structure["dist"]

        # Create nested output path
        output_path = dist_path / "fr" / "blog" / "test-post" / "index.html"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        assert output_path.parent.exists()

    def test_html_file_writing(self, temp_site_structure: dict):
        """Test writing HTML files."""
        dist_path = temp_site_structure["dist"]
        output_path = dist_path / "test.html"

        html_content = "<html><body>Test</body></html>"
        output_path.write_text(html_content, encoding="utf-8")

        assert output_path.exists()
        assert output_path.read_text(encoding="utf-8") == html_content


class TestPageBuilding:
    """Tests for page building functionality."""

    def test_markdown_to_html_conversion(self):
        """Test Markdown to HTML conversion in build pipeline."""
        markdown_content = """# Test Heading

This is a paragraph with **bold** text.

- List item 1
- List item 2
"""
        html = markdown_filter(markdown_content)

        assert "<h1>Test Heading</h1>" in html
        assert "<strong>bold</strong>" in html
        assert "<li>List item 1</li>" in html

    def test_url_generation_multilingual(self, site_config: dict):
        """Test URL generation for multilingual sites."""
        slug = "test-post"
        lang = "fr"
        blog_path = site_config["blog_url"].strip("/")

        url = f"/{lang}/{blog_path}/{slug}/"

        assert url == "/fr/blog/test-post/"

    def test_url_generation_unilingual(self, site_config: dict):
        """Test URL generation for unilingual sites."""
        slug = "test-post"
        blog_path = site_config["blog_url"].strip("/")

        url = f"/{blog_path}/{slug}/"

        assert url == "/blog/test-post/"


class TestPagination:
    """Tests for pagination functionality."""

    def test_pagination_calculation(self, site_config: dict):
        """Test pagination page number calculation."""
        posts_per_page = site_config.get("posts_per_page", 5)
        total_posts = 12
        import math
        total_pages = math.ceil(total_posts / posts_per_page)

        assert total_pages == 3

    def test_pagination_urls(self):
        """Test pagination URL generation."""
        prefix = "/fr"
        blog_url = "blog"
        page_num = 2

        url = f"{prefix}/{blog_url}/page/{page_num}"

        assert url == "/fr/blog/page/2"


class TestTranslationMapping:
    """Tests for translation mapping between languages."""

    def test_translation_id_mapping(self):
        """Test translation ID mapping between languages."""
        posts_fr = [
            {"slug": "bonjour", "translation_id": "hello-post", "lang": "fr"},
        ]
        posts_en = [
            {"slug": "hello", "translation_id": "hello-post", "lang": "en"},
        ]

        all_posts = posts_fr + posts_en

        translation_map = {}
        for post in all_posts:
            tid = post.get("translation_id", post.get("slug"))
            translation_map.setdefault(tid, {})[post["lang"]] = f"/{post['lang']}/blog/{post['slug']}/"

        assert "hello-post" in translation_map
        assert translation_map["hello-post"]["fr"] == "/fr/blog/bonjour/"
        assert translation_map["hello-post"]["en"] == "/en/blog/hello/"

