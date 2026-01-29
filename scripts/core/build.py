import argparse
import logging
import sys
from pathlib import Path

# Add scripts directory to Python path
scripts_dir = Path(__file__).parent.parent
sys.path.insert(0, str(scripts_dir))

from builders.gallery_builder import GalleryBuilder
from builders.glossary_builder import GlossaryBuilder
from builders.post_builder import PostBuilder
from core.config_loader import ConfigLoader
from core.context import BuildContext
from core.static_file_manager import StaticFileManager
from jinja2 import Environment, FileSystemLoader, select_autoescape
from utils.utils import format_date_filter, markdown_filter, slugify

# UTF-8 encoding configuration removed due to linter compatibility

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

ICON_START = "🚀"
ICON_CLEAN = "🧹"
ICON_COPY = "📋"
ICON_BUILD = "📝"
ICON_GLOSSARY = "📖"
ICON_CATEGORY = "📂"
ICON_REDIRECT = "🔀"
ICON_SUCCESS = "✨"
ICON_ERROR = "❌"


class SiteBuilder:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent.parent
        self.src_path = self.base_path / "src"
        self.dist_path = self.base_path / "dist"

        config_loader = ConfigLoader(self.src_path)
        self.translations = config_loader.load_translations()
        self.projects = config_loader.load_projects()
        self.site_config = config_loader.load_site_config()

        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.src_path / "templates")),
            autoescape=select_autoescape(["html", "xml"]),
        )
        self.jinja_env.filters["date"] = format_date_filter
        self.jinja_env.filters["markdown"] = markdown_filter
        self.jinja_env.filters["slugify"] = slugify

        self.is_multilingual = len(self.site_config.get("languages", [])) > 1
        self.jinja_env.globals["is_multilingual"] = self.is_multilingual
        self.jinja_env.globals["is_unilingual"] = not self.is_multilingual

        self.static_manager = StaticFileManager(self.src_path, self.dist_path)

        ctx = BuildContext(
            src_path=self.src_path,
            dist_path=self.dist_path,
            site_config=self.site_config,
            translations=self.translations,
            jinja_env=self.jinja_env,
            projects=self.projects,
        )

        # Initialize builders with BuildContext
        self.post_builder = PostBuilder(ctx)
        self.glossary_builder = GlossaryBuilder(ctx)

        # Import locally to avoid circular dependency
        from builders.page_builder import PageBuilder

        self.page_builder = PageBuilder(
            ctx,
            post_builder=self.post_builder,
        )

    def build(self):
        try:
            logging.info(f"{ICON_START} Début de la construction du site...")
            logging.info(f"{ICON_CLEAN} Nettoyage du dossier de sortie...")
            self.static_manager.setup_output_dir()
            logging.info(f"{ICON_COPY} Copie des fichiers statiques...")
            self.static_manager.copy_static_files()

            gallery_builder = GalleryBuilder(
                self.src_path,
                self.dist_path,
                self.jinja_env,
                self.site_config,
                self.translations,
            )
            gallery_builder.build_gallery()

            logging.info(f"{ICON_BUILD} Génération des pages...")
            self.page_builder.build_pages()
            logging.info(f"{ICON_BUILD} Génération des posts...")
            posts = self.post_builder.build_posts()
            logging.info(f"{ICON_GLOSSARY} Génération du glossaire...")
            self.glossary_builder.build_terms()
            logging.info(
                f"{ICON_CATEGORY} Regroupement des posts pour les catégories et mots-clés..."
            )
            categories = {}
            keywords = {}
            tags = {}
            for post in posts:
                for category in post.get("categories", []):
                    categories.setdefault(category, []).append(post)
                for keyword in post.get("meta_keywords", []):
                    keywords.setdefault(keyword, []).append(post)
                for tag in post.get("tags", []):
                    tags.setdefault(tag, []).append(post)

            logging.info(f"{ICON_CATEGORY} Génération des pages pour les catégories...")
            self.page_builder.build_category_pages(categories)
            logging.info(f"{ICON_CATEGORY} Génération des pages pour les mots-clés...")
            self.page_builder.build_keyword_pages(keywords)
            logging.info(f"{ICON_CATEGORY} Génération des pages pour les tags...")
            self.page_builder.build_tag_pages(tags)
            logging.info(f"{ICON_REDIRECT} Création de la redirection racine...")
            if self.is_multilingual:
                self.page_builder.build_root_redirect()
            logging.info(f"{ICON_SUCCESS} Site construit avec succès!")
        except Exception as e:
            logging.error(
                f"{ICON_ERROR} Erreur durant la construction du site: {e}",
                exc_info=True,
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Site Builder CLI options")
    parser.add_argument("--build", action="store_true", help="Build the site")

    args = parser.parse_args()
    if args.build:
        builder = SiteBuilder()
        builder.build()
    else:
        parser.print_help()
