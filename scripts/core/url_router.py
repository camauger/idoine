"""
URL routing for the IDOINE static site generator.

Handles URL generation based on content type, language,
and site configuration.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class RouteInfo:
    """Container for routing information."""

    url: str
    output_path: Path
    is_index: bool = False


class URLRouter:
    """
    Generates URLs and output paths for content.

    Centralizes all URL generation logic for consistent routing
    across the site.
    """

    def __init__(
        self,
        site_config: Dict[str, Any],
        dist_path: Path,
    ):
        """
        Initialize the URLRouter.

        Args:
            site_config: Site configuration dictionary.
            dist_path: Base output directory path.
        """
        self.site_config = site_config
        self.dist_path = Path(dist_path)
        self.is_unilingual = (
            site_config.get("unilingual", False)
            or len(site_config.get("languages", [])) <= 1
        )
        blog_path = site_config.get("blog_url", "blog")
        post_base = site_config.get("post_base_url")
        self.blog_path = str(blog_path).strip("/")
        if post_base is None:
            post_base = self.blog_path
        self.post_base_path = str(post_base).strip("/")

    def route_post(
        self,
        slug: str,
        lang: str,
    ) -> RouteInfo:
        """
        Generate route info for a blog post.

        Args:
            slug: URL slug for the post.
            lang: Language code.

        Returns:
            RouteInfo with URL and output path.
        """
        segments = []
        if not self.is_unilingual:
            segments.append(lang)
        if self.post_base_path:
            segments.append(self.post_base_path)
        segments.append(slug)
        url = "/" + "/".join(segments)
        output_path = self.dist_path.joinpath(*segments, "index.html")
        return RouteInfo(url=url, output_path=output_path)

    def route_page(
        self,
        page_name: str,
        lang: str,
        custom_url: Optional[str] = None,
    ) -> RouteInfo:
        """
        Generate route info for a static page.

        Args:
            page_name: Name/stem of the page file.
            lang: Language code.
            custom_url: Optional custom URL override.

        Returns:
            RouteInfo with URL and output path.
        """
        is_home = page_name == "home"

        if custom_url is not None:
            url = custom_url
        elif self.is_unilingual:
            url = "/" if is_home else f"/{page_name}"
        else:
            url = f"/{lang}" if is_home else f"/{lang}/{page_name}"

        if self.is_unilingual:
            if is_home:
                output_path = self.dist_path / "index.html"
            else:
                output_path = self.dist_path / page_name / "index.html"
        else:
            lang_dir = self.dist_path / lang
            if is_home:
                output_path = lang_dir / "index.html"
            else:
                output_path = lang_dir / page_name / "index.html"

        return RouteInfo(url=url, output_path=output_path, is_index=is_home)

    def route_glossary_term(
        self,
        slug: str,
        lang: str,
    ) -> RouteInfo:
        """
        Generate route info for a glossary term.

        Args:
            slug: URL slug for the term.
            lang: Language code.

        Returns:
            RouteInfo with URL and output path.
        """
        glossary_path = self.site_config.get("glossary_url", "/glossaire").strip("/")

        if self.is_unilingual:
            url = f"/{glossary_path}/{slug}"
            output_path = self.dist_path / glossary_path / slug / "index.html"
        else:
            url = f"/{lang}/{glossary_path}/{slug}"
            output_path = self.dist_path / lang / glossary_path / slug / "index.html"

        return RouteInfo(url=url, output_path=output_path)

    def route_category(
        self,
        category_slug: str,
        lang: str,
        page_num: int = 1,
    ) -> RouteInfo:
        """
        Generate route info for a category page.

        Args:
            category_slug: URL slug for the category.
            lang: Language code.
            page_num: Page number for pagination.

        Returns:
            RouteInfo with URL and output path.
        """
        blog_path = self.site_config.get("blog_url", "blog").strip("/")
        categories_path = "categories"

        if self.is_unilingual:
            base = f"/{blog_path}/{categories_path}/{category_slug}"
        else:
            base = f"/{lang}/{blog_path}/{categories_path}/{category_slug}"

        if page_num == 1:
            url = base
            output_path = self._path_from_url(f"{base}/index.html")
        else:
            url = f"{base}/page/{page_num}"
            output_path = self._path_from_url(f"{base}/page/{page_num}/index.html")

        return RouteInfo(url=url, output_path=output_path)

    def route_tag(
        self,
        tag_slug: str,
        lang: str,
        base_path: str = "glossaire",
    ) -> RouteInfo:
        """
        Generate route info for a tag page.

        Args:
            tag_slug: URL slug for the tag.
            lang: Language code.
            base_path: Base path (glossaire or blog).

        Returns:
            RouteInfo with URL and output path.
        """
        if self.is_unilingual:
            url = f"/{base_path}/tags/{tag_slug}"
            output_path = self.dist_path / base_path / "tags" / tag_slug / "index.html"
        else:
            url = f"/{lang}/{base_path}/tags/{tag_slug}"
            output_path = (
                self.dist_path / lang / base_path / "tags" / tag_slug / "index.html"
            )

        return RouteInfo(url=url, output_path=output_path)

    def _path_from_url(self, url: str) -> Path:
        """Convert a URL path to a file system path."""
        # Remove leading slash and convert to path
        clean_url = url.lstrip("/")
        return self.dist_path / clean_url
