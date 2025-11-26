import logging
import math
from pathlib import Path
from typing import Optional

from core.context import BuildContext
from utils.frontmatter_parser import parse_frontmatter
from utils.utils import build_page


class PostBuilder:
    """Builder for blog posts with pagination and multilingual support."""

    def __init__(self, context: BuildContext):
        """
        Initialize PostBuilder with a BuildContext.

        Args:
            context: BuildContext containing all shared build configuration.
        """
        self.src_path = context.src_path
        self.dist_path = context.dist_path
        self.site_config = context.site_config
        self.translations = context.translations
        self.jinja_env = context.jinja_env
        self.projects = context.projects
        self.blog_url = self.site_config.get("blog_url", "blog").strip("/")
        self.post_base_path = (
            self.site_config.get("post_base_url", self.blog_url).strip("/") if self.site_config.get("post_base_url") is not None else self.blog_url
        )
        self.posts_per_page = self.site_config.get("posts_per_page", 5)
        self.post_template = self.site_config.get("post_template", "posts/post.html")
        self.blog_template = self.site_config.get("blog_template", "pages/blog.html")
        self.home_template = self.site_config.get("home_template", "pages/home.html")
        self.unilingual = len(self.site_config.get("languages", [])) == 1

    def _get_posts_dir(self, lang: str) -> Optional[Path]:
        """Retourne le dossier contenant les posts pour la langue donnée."""
        posts_dir = self.src_path / "locales" / lang / "blog"
        if not posts_dir.exists():
            posts_dir = self.src_path / "locales" / lang / "posts"
        return posts_dir if posts_dir.exists() else None

    def load_posts(self, lang: str) -> list:
        posts = []
        posts_dir = self._get_posts_dir(lang)
        if posts_dir:
            for post_file in posts_dir.glob("*.md"):
                content = post_file.read_text(encoding="utf-8")
                metadata, _ = parse_frontmatter(content)
                slug = metadata.get("slug", post_file.stem)
                tid = str(metadata.get("translation_id", slug))
                summary = metadata.get("summary") or metadata.get("description", "")
                excerpt = metadata.get("excerpt") or summary
                post_data = {
                    "title": metadata.get("title", "Article sans titre"),
                    "date": metadata.get("date", ""),
                    "author": metadata.get("author", ""),
                    "url": self._build_post_url(slug, lang),
                    "slug": slug,
                    "translation_id": tid,
                    "summary": summary,
                    "excerpt": excerpt,
                    "categories": metadata.get("categories", []),
                    "meta_keywords": metadata.get("meta_keywords", []),
                    "tags": metadata.get("tags", []),
                    "thumbnail": metadata.get("thumbnail", ""),
                    "lang": lang,
                }
                posts.append(post_data)
        posts.sort(key=lambda x: x["date"], reverse=True)
        return posts

    def paginate_posts(self, posts: list, lang: str) -> list:
        total_pages = math.ceil(len(posts) / self.posts_per_page) if posts else 1
        paginated = []
        list_segments = []
        if not self.unilingual:
            list_segments.append(lang)
        if self.blog_url:
            list_segments.append(self.blog_url)
        base_url = self._build_url(*list_segments)
        for i in range(total_pages):
            page_posts = posts[i * self.posts_per_page : (i + 1) * self.posts_per_page]
            current_page = i + 1
            current_url = (
                base_url if current_page == 1 else self._build_url(*(list_segments + ["page", str(current_page)]))
            )
            prev_url = (
                None
                if current_page == 1
                else (
                    base_url
                    if current_page - 1 == 1
                    else self._build_url(*(list_segments + ["page", str(current_page - 1)]))
                )
            )
            next_url = (
                None
                if current_page == total_pages
                else self._build_url(*(list_segments + ["page", str(current_page + 1)]))
            )
            paginated.append(
                {
                    "posts": page_posts,
                    "current_page": current_page,
                    "prev_page": prev_url,
                    "next_page": next_url,
                    "pages": [
                        {
                            "number": j + 1,
                            "url": (
                                base_url
                                if j + 1 == 1
                                else self._build_url(*(list_segments + ["page", str(j + 1)]))
                            ),
                        }
                        for j in range(total_pages)
                    ],
                    "base_url": base_url,
                }
            )
        logging.info(
            f"📢 Pagination créée pour {lang}: {total_pages} pages, {len(posts)} articles"
        )
        return paginated

    def build_translation_map(self, all_posts: list) -> dict:
        translation_map = {}
        for post in all_posts:
            tid = str(post.get("translation_id", post.get("slug")))
            translation_map.setdefault(tid, {})[post["lang"]] = post["url"]
        return translation_map

    def _build_individual_post(
        self, post_file: Path, lang: str, translation_map: dict
    ) -> None:
        content = post_file.read_text(encoding="utf-8")
        metadata, _ = parse_frontmatter(content)
        slug = metadata.get("slug", post_file.stem)
        tid = str(metadata.get("translation_id", slug))
        content_translations = translation_map.get(tid, {})
        output = build_page(
            content,
            self.post_template,
            lang,
            custom_url=None,
            is_post=True,
            slug=slug,
            translations=self.translations[lang],
            site_config=self.site_config,
            projects=self.projects,
            jinja_env=self.jinja_env,
            content_translations=content_translations,
        )
        output_path = self._build_post_output_path(slug, lang)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output, encoding="utf-8")

    def _build_paginated_pages(self, posts: list, lang: str) -> None:
        paginated = self.paginate_posts(posts, lang)
        list_segments = []
        if not self.unilingual:
            list_segments.append(lang)
        if self.blog_url:
            list_segments.append(self.blog_url)
        for page in paginated:
            page_metadata = {
                "title": self.translations[lang].get("blog_title", self.translations[lang].get("blog", "Articles")),
                "description": self.translations[lang].get("blog_description", ""),
                "lang": lang,
                "url": page["base_url"],
                "pagination": page,
            }
            logging.info(
                f"📢 Génération de la page {page['current_page']} avec {len(page['posts'])} articles"
            )
            output = self.jinja_env.get_template(self.blog_template).render(
                pagination=page,
                page=page_metadata,
                t=self.translations[lang],
                site=self.site_config,
                projects=self.projects,
            )
            if page["current_page"] == 1:
                output_path = self._build_output_path(*list_segments)
            else:
                output_path = self._build_output_path(
                    *(list_segments + ["page", str(page["current_page"])])
                )
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(output, encoding="utf-8")

    def get_recent_posts(self, posts: list, count: int = 3) -> list:
        """Retourne les posts récents (par défaut, les 3 premiers)."""
        return posts[:count]

    def _build_home_page(
        self, recent_posts: list, lang: str, content_translations: dict = None
    ) -> None:
        """Build the home page with recent posts and language switcher support."""
        # Determine URL for this language's home page
        home_url = "/" if self.unilingual else f"/{lang}/"

        # Build content_translations if not provided
        if content_translations is None:
            content_translations = {}
            for l in self.site_config.get("languages", []):
                content_translations[l] = "/" if self.unilingual else f"/{l}/"

        page_metadata = {
            "title": self.translations[lang].get("home_title", "Accueil"),
            "description": self.translations[lang].get("home_description", ""),
            "lang": lang,
            "url": home_url,
            "content_translations": content_translations,
            "home_cta": self.translations[lang].get("home_cta", "En savoir plus"),
            "home_image": self.translations[lang].get("home_image", ""),
        }
        output = self.jinja_env.get_template(self.home_template).render(
            page=page_metadata,
            recent_posts=recent_posts,
            t=self.translations[lang],
            site=self.site_config,
            projects=self.projects,
        )
        output_path = (
            self.dist_path / "index.html"
            if self.unilingual
            else self.dist_path / lang / "index.html"
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output, encoding="utf-8")

    def build_posts(self) -> list:
        all_posts = []
        posts_by_lang = {}
        # Charger les posts pour chaque langue
        for lang in self.site_config["languages"]:
            posts_dir = self._get_posts_dir(lang)
            if posts_dir:
                posts = self.load_posts(lang)
                posts_by_lang[lang] = posts
                all_posts.extend(posts)

        # Construire le mapping global des traductions
        translation_map = self.build_translation_map(all_posts)

        # Générer les pages individuelles et paginées
        # Note: La page d'accueil est générée par page_builder.build_pages()
        # avec le bon contexte de traduction (content_translations)
        for lang, posts in posts_by_lang.items():
            posts_dir = self._get_posts_dir(lang)
            if posts_dir:
                for post_file in posts_dir.glob("*.md"):
                    self._build_individual_post(post_file, lang, translation_map)
                self._build_paginated_pages(posts, lang)

        # Injection du mapping dans chaque post (pour usage ultérieur, log, etc.)
        for post in all_posts:
            post["translations"] = translation_map.get(post["translation_id"], {})
            logging.info(f"Post {post['slug']} translations: {post['translations']}")
        return all_posts

    def _clean_segment(self, segment: Optional[str]) -> Optional[str]:
        if segment is None:
            return None
        text = str(segment).strip()
        if not text:
            return None
        return text.strip("/")

    def _build_url(self, *segments: Optional[str]) -> str:
        cleaned = [seg for seg in (self._clean_segment(s) for s in segments) if seg]
        if not cleaned:
            return "/"
        return "/" + "/".join(cleaned)

    def _build_output_path(self, *segments: Optional[str]) -> Path:
        cleaned = [seg for seg in (self._clean_segment(s) for s in segments) if seg]
        return self.dist_path.joinpath(*cleaned, "index.html")

    def _build_post_url(self, slug: str, lang: str) -> str:
        segments = []
        if not self.unilingual:
            segments.append(lang)
        if self.post_base_path:
            segments.append(self.post_base_path)
        segments.append(slug)
        return self._build_url(*segments)

    def _build_post_output_path(self, slug: str, lang: str) -> Path:
        segments = []
        if not self.unilingual:
            segments.append(lang)
        if self.post_base_path:
            segments.append(self.post_base_path)
        segments.append(slug)
        return self._build_output_path(*segments)
