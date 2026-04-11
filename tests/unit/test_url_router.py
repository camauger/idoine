"""
Unit tests for the URL router module.
"""

from pathlib import Path

import pytest
from core.url_router import RouteInfo, URLRouter


class TestRouteInfo:
    """Tests for the RouteInfo dataclass."""

    def test_create_route_info(self):
        """Test creating a RouteInfo instance."""
        route = RouteInfo(
            url="/fr/blog/test-post",
            output_path=Path("/dist/fr/blog/test-post/index.html"),
        )
        assert route.url == "/fr/blog/test-post"
        assert route.output_path == Path("/dist/fr/blog/test-post/index.html")
        assert route.is_index is False

    def test_route_info_with_is_index(self):
        """Test RouteInfo with is_index flag."""
        route = RouteInfo(
            url="/fr",
            output_path=Path("/dist/fr/index.html"),
            is_index=True,
        )
        assert route.is_index is True


class TestURLRouterMultilingual:
    """Tests for URLRouter with multilingual configuration."""

    @pytest.fixture
    def multilingual_config(self) -> dict:
        """Sample multilingual site configuration."""
        return {
            "languages": ["fr", "en"],
            "default_lang": "fr",
            "blog_url": "/blog/",
            "glossary_url": "/glossaire/",
        }

    @pytest.fixture
    def router(self, multilingual_config: dict, tmp_path: Path) -> URLRouter:
        """Create a URLRouter instance for testing."""
        return URLRouter(multilingual_config, tmp_path / "dist")

    def test_route_post_multilingual(self, router: URLRouter):
        """Test post routing for multilingual site."""
        route = router.route_post("mon-article", "fr")
        assert route.url == "/fr/blog/mon-article"
        assert "fr" in str(route.output_path)
        assert "blog" in str(route.output_path)
        assert "index.html" in str(route.output_path)

    def test_route_post_different_lang(self, router: URLRouter):
        """Test post routing with different language."""
        route = router.route_post("my-post", "en")
        assert route.url == "/en/blog/my-post"
        assert "en" in str(route.output_path)

    def test_route_home_page_multilingual(self, router: URLRouter):
        """Test home page routing for multilingual site."""
        route = router.route_page("home", "fr")
        assert route.url == "/fr"
        assert route.is_index is True
        assert str(route.output_path).endswith("index.html")

    def test_route_regular_page_multilingual(self, router: URLRouter):
        """Test regular page routing for multilingual site."""
        route = router.route_page("about", "fr")
        assert route.url == "/fr/about"
        assert route.is_index is False

    def test_route_page_with_custom_url(self, router: URLRouter):
        """Test page routing with custom URL override."""
        route = router.route_page("contact", "fr", custom_url="/nous-joindre")
        assert route.url == "/nous-joindre"

    def test_route_glossary_term_multilingual(self, router: URLRouter):
        """Test glossary term routing for multilingual site."""
        route = router.route_glossary_term("algorithme", "fr")
        assert route.url == "/fr/glossaire/algorithme"
        assert "glossaire" in str(route.output_path)

    def test_route_category_first_page(self, router: URLRouter):
        """Test category routing for first page."""
        route = router.route_category("technologie", "fr", page_num=1)
        assert route.url == "/fr/blog/categories/technologie"
        assert "page" not in route.url

    def test_route_category_pagination(self, router: URLRouter):
        """Test category routing with pagination."""
        route = router.route_category("technologie", "fr", page_num=3)
        assert route.url == "/fr/blog/categories/technologie/page/3"
        # Use Path parts to check for pagination in a platform-independent way
        assert "page" in route.output_path.parts
        assert "3" in route.output_path.parts

    def test_route_tag(self, router: URLRouter):
        """Test tag routing for multilingual site."""
        route = router.route_tag("python", "fr")
        assert route.url == "/fr/glossaire/tags/python"

    def test_route_tag_with_custom_base(self, router: URLRouter):
        """Test tag routing with custom base path."""
        route = router.route_tag("python", "fr", base_path="blog")
        assert route.url == "/fr/blog/tags/python"


class TestURLRouterUnilingual:
    """Tests for URLRouter with unilingual configuration."""

    @pytest.fixture
    def unilingual_config(self) -> dict:
        """Sample unilingual site configuration."""
        return {
            "languages": ["fr"],
            "default_lang": "fr",
            "unilingual": True,
            "blog_url": "/blog/",
            "glossary_url": "/glossaire/",
        }

    @pytest.fixture
    def router(self, unilingual_config: dict, tmp_path: Path) -> URLRouter:
        """Create a URLRouter instance for testing."""
        return URLRouter(unilingual_config, tmp_path / "dist")

    def test_route_post_unilingual(self, router: URLRouter):
        """Test post routing for unilingual site."""
        route = router.route_post("mon-article", "fr")
        assert route.url == "/blog/mon-article"
        # No language prefix
        assert "/fr/" not in route.url

    def test_route_home_page_unilingual(self, router: URLRouter):
        """Test home page routing for unilingual site."""
        route = router.route_page("home", "fr")
        assert route.url == "/"
        assert route.is_index is True

    def test_route_regular_page_unilingual(self, router: URLRouter):
        """Test regular page routing for unilingual site."""
        route = router.route_page("about", "fr")
        assert route.url == "/about"
        assert "/fr/" not in route.url

    def test_route_glossary_term_unilingual(self, router: URLRouter):
        """Test glossary term routing for unilingual site."""
        route = router.route_glossary_term("algorithme", "fr")
        assert route.url == "/glossaire/algorithme"
        assert "/fr/" not in route.url

    def test_route_category_unilingual(self, router: URLRouter):
        """Test category routing for unilingual site."""
        route = router.route_category("technologie", "fr")
        assert route.url == "/blog/categories/technologie"
        assert "/fr/" not in route.url

    def test_route_tag_unilingual(self, router: URLRouter):
        """Test tag routing for unilingual site."""
        route = router.route_tag("python", "fr")
        assert route.url == "/glossaire/tags/python"
        assert "/fr/" not in route.url


class TestURLRouterCustomPaths:
    """Tests for URLRouter with custom URL configurations."""

    def test_custom_post_base_url(self, tmp_path: Path):
        """Test routing with custom post base URL."""
        config = {
            "languages": ["fr"],
            "blog_url": "/blog/",
            "post_base_url": "/articles/",
        }
        router = URLRouter(config, tmp_path / "dist")
        route = router.route_post("mon-article", "fr")
        assert route.url == "/articles/mon-article"

    def test_empty_blog_path(self, tmp_path: Path):
        """Test routing with empty blog path."""
        config = {
            "languages": ["fr", "en"],
            "blog_url": "",
        }
        router = URLRouter(config, tmp_path / "dist")
        route = router.route_post("mon-article", "fr")
        assert route.url == "/fr/mon-article"

    def test_custom_glossary_path(self, tmp_path: Path):
        """Test routing with custom glossary path."""
        config = {
            "languages": ["fr"],
            "glossary_url": "/lexique/",
        }
        router = URLRouter(config, tmp_path / "dist")
        route = router.route_glossary_term("terme", "fr")
        assert route.url == "/lexique/terme"
