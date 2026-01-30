"""
Package utils - Utilitaires et fonctions d'assistance.

Ce package contient les fonctions utilitaires réutilisables
et les helpers utilisés dans le générateur de site statique.
"""

from .frontmatter_parser import parse_frontmatter
from .gallery_utils import (
    copy_images,
    find_image_files,
    find_images_dir,
    generate_resized_images,
)
from .metadata import extract_metadata
from .utils import build_page, format_date_filter, markdown_filter, slugify

__all__ = [
    # Core utilities
    "markdown_filter",
    "build_page",
    "format_date_filter",
    "slugify",
    "parse_frontmatter",
    # Gallery utilities
    "copy_images",
    "find_image_files",
    "find_images_dir",
    "generate_resized_images",
    # Metadata
    "extract_metadata",
]
