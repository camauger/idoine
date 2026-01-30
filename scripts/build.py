import argparse
from pathlib import Path

from config_loader import ConfigLoader
from gallery_builder import GalleryBuilder
from glossary_builder import GlossaryBuilder
from jinja2 import Environment, FileSystemLoader, select_autoescape
from page_builder import PageBuilder
from post_builder import PostBuilder
from static_file_manager import StaticFileManager
from utils.logger import get_logger, setup_logging
from utils.utils import format_date_filter, markdown_filter, slugify

# Configure logging with icon support (respects IDOINE_USE_ICONS env var)
setup_logging()
logger = get_logger()


class SiteBuilder:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
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

        self.post_builder = PostBuilder(
            self.src_path,
            self.dist_path,
            self.site_config,
            self.translations,
            self.jinja_env,
            self.projects,
        )

        self.glossary_builder = GlossaryBuilder(
            self.src_path,
            self.dist_path,
            self.site_config,
            self.translations,
            self.jinja_env,
            self.projects,
        )

        self.page_builder = PageBuilder(
            self.src_path,
            self.dist_path,
            self.site_config,
            self.translations,
            self.jinja_env,
            self.projects,
            post_builder=self.post_builder,
        )

    def build(self):
        try:
            logger.start("Début de la construction du site...")
            logger.clean("Nettoyage du dossier de sortie...")
            self.static_manager.setup_output_dir()
            logger.copy("Copie des fichiers statiques...")
            self.static_manager.copy_static_files()

            gallery_builder = GalleryBuilder(
                self.src_path,
                self.dist_path,
                self.jinja_env,
                self.site_config,
                self.translations,
            )
            gallery_builder.build_gallery()

            logger.build("Génération des pages...")
            self.page_builder.build_pages()
            logger.build("Génération des posts...")
            posts = self.post_builder.build_posts()
            logger.glossary("Génération du glossaire...")
            self.glossary_builder.build_terms()
            logger.category(
                "Regroupement des posts pour les catégories et mots-clés..."
            )
            categories = {}
            keywords = {}
            for post in posts:
                for category in post.get("categories", []):
                    categories.setdefault(category, []).append(post)
                for keyword in post.get("meta_keywords", []):
                    keywords.setdefault(keyword, []).append(post)

            self.page_builder.build_category_pages(categories)
            self.page_builder.build_keyword_pages(keywords)

            logger.category("Génération des pages pour les catégories...")
            self.page_builder.build_category_pages(categories)
            logger.category("Génération des pages pour les mots-clés...")
            self.page_builder.build_keyword_pages(keywords)
            logger.redirect("Création de la redirection racine...")
            if self.is_multilingual:
                self.page_builder.build_root_redirect()
            logger.success("Site construit avec succès!")
        except Exception as e:
            logger.error(f"Erreur durant la construction du site: {e}", exc_info=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Site Builder CLI options")
    parser.add_argument("--build", action="store_true", help="Build the site")

    args = parser.parse_args()
    if args.build:
        builder = SiteBuilder()
        builder.build()
    else:
        parser.print_help()
