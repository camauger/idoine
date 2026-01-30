"""
Gallery image utilities for the IDOINE static site generator.

Handles image discovery, copying, and resizing with path validation.
"""

import logging
import shutil
from pathlib import Path
from typing import List, Optional

from PIL import Image, ImageOps

from .path_validator import PathValidationError, validate_path_within_base

logger = logging.getLogger(__name__)


def find_images_dir(src_path: Path) -> Optional[Path]:
    """
    Cherche le dossier d'images en vérifiant plusieurs emplacements.
    """
    images_dir = src_path / "assets/gallery_images"
    if not images_dir.exists():
        images_dir = src_path.parent / "assets/gallery_images"
    if not images_dir.exists():
        images_dir = src_path.parent.parent / "assets/images"
    return images_dir


def find_image_files(images_dir: Path) -> list:
    """
    Retourne la liste des fichiers images (formats PNG, JPG, JPEG, GIF)
    sous forme de chemins relatifs en notation posix.
    """
    if not images_dir.exists():
        return []
    image_extensions = (".png", ".jpg", ".jpeg", ".gif")
    return [
        p.relative_to(images_dir).as_posix()
        for p in images_dir.glob("**/*")
        if p.is_file() and p.suffix.lower() in image_extensions
    ]


def copy_images(images_dir: Path, dist_path: Path) -> None:
    """
    Copy images from source to assets/gallery_images preserving directory structure.

    Validates all paths to prevent path traversal attacks.

    Args:
        images_dir: Source directory containing images.
        dist_path: Destination root directory.
    """
    image_extensions = (".png", ".jpg", ".jpeg", ".gif", ".webp")
    target_images_dir = dist_path / "assets" / "gallery_images"
    target_images_dir.mkdir(parents=True, exist_ok=True)

    images_dir = Path(images_dir).resolve()
    dist_path = Path(dist_path).resolve()

    for src_image in images_dir.glob("**/*"):
        if src_image.is_file() and src_image.suffix.lower() in image_extensions:
            # Validate source path
            try:
                validate_path_within_base(src_image, images_dir)
            except PathValidationError as e:
                logger.warning(f"Image source invalide ignorée : {e}")
                continue

            relative_path = src_image.relative_to(images_dir)
            dst_image = target_images_dir / relative_path

            # Validate destination path
            try:
                validate_path_within_base(dst_image, dist_path)
            except PathValidationError as e:
                logger.warning(f"Chemin de destination invalide ignoré : {e}")
                continue

            dst_image.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_image, dst_image)
            logger.info("Copié : %s -> %s", src_image, dst_image)


def _save_image(image: Image.Image, dest: Path, suffix: str, width: int) -> None:
    dest = dest.with_suffix(suffix)
    dest.parent.mkdir(parents=True, exist_ok=True)
    transposed = ImageOps.exif_transpose(image)
    img: Image.Image = transposed if isinstance(transposed, Image.Image) else image
    img = img.convert("RGB")
    img_copy = img.copy()
    img_copy.thumbnail((width, width * 10_000))
    if suffix.lower() == ".webp":
        img_copy.save(dest, format="WEBP", quality=85, method=6)
    elif suffix.lower() in (".jpg", ".jpeg"):
        img_copy.save(dest, format="JPEG", quality=85, optimize=True, progressive=True)
    else:
        img_copy.save(dest, format="PNG", optimize=True)


def generate_resized_images(images_dir: Path, dist_path: Path) -> None:
    """
    Generate resized images (small/medium/large) and WebP variants.

    Creates optimized versions under dist/assets/gallery_images/{size}/...
    Validates all paths to prevent path traversal attacks.

    Args:
        images_dir: Source directory containing original images.
        dist_path: Destination root directory.
    """
    if not images_dir.exists():
        return

    images_dir = Path(images_dir).resolve()
    dist_path = Path(dist_path).resolve()
    target_root = dist_path / "assets" / "gallery_images"

    sizes = {
        "small": 300,
        "medium": 800,
        "large": 1200,
    }
    image_extensions = (".png", ".jpg", ".jpeg", ".gif", ".webp")

    for src_image in images_dir.glob("**/*"):
        if not (src_image.is_file() and src_image.suffix.lower() in image_extensions):
            continue

        # Validate source path
        try:
            validate_path_within_base(src_image, images_dir)
        except PathValidationError as e:
            logger.warning(f"Image source invalide ignorée : {e}")
            continue

        relative_path = src_image.relative_to(images_dir)

        try:
            with Image.open(src_image) as im:
                for size_name, width in sizes.items():
                    base_dest = target_root / size_name / relative_path

                    # Validate destination path
                    try:
                        validate_path_within_base(base_dest.parent, dist_path)
                    except PathValidationError as e:
                        logger.warning(f"Destination invalide ignorée : {e}")
                        continue

                    # Save fallback in original extension (jpg/png)
                    fallback_suffix = (
                        ".jpg"
                        if src_image.suffix.lower() in (".jpg", ".jpeg")
                        else (".png" if src_image.suffix.lower() == ".png" else ".jpg")
                    )
                    _save_image(im, base_dest, fallback_suffix, width)
                    # Save WebP variant
                    _save_image(im, base_dest, ".webp", width)
        except Exception as e:
            logger.error("Erreur lors du redimensionnement de %s: %s", src_image, e)
