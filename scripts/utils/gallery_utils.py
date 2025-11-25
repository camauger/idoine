import logging
import shutil
from pathlib import Path

from PIL import Image, ImageOps


def find_images_dir(src_path: Path) -> Path:
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
    Copie les images depuis le dossier source vers assets/gallery_images en conservant l'arborescence.
    """
    image_extensions = (".png", ".jpg", ".jpeg", ".gif")
    target_images_dir = dist_path / "assets" / "gallery_images"
    target_images_dir.mkdir(parents=True, exist_ok=True)
    for src_image in images_dir.glob("**/*"):
        if src_image.is_file() and src_image.suffix.lower() in image_extensions:
            relative_path = src_image.relative_to(images_dir)
            dst_image = target_images_dir / relative_path
            dst_image.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_image, dst_image)
            logging.info("Copié : %s -> %s", src_image, dst_image)


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
    Generate resized images (small/medium/large) and WebP variants under
    dist/assets/gallery_images/{size}/...
    """
    if not images_dir.exists():
        return
    target_root = dist_path / "assets" / "gallery_images"
    sizes = {
        "small": 300,
        "medium": 800,
        "large": 1200,
    }
    image_extensions = (".png", ".jpg", ".jpeg", ".gif")
    for src_image in images_dir.glob("**/*"):
        if not (src_image.is_file() and src_image.suffix.lower() in image_extensions):
            continue
        relative_path = src_image.relative_to(images_dir)
        # Base destination without size folder, will prepend size below
        try:
            with Image.open(src_image) as im:
                for size_name, width in sizes.items():
                    base_dest = target_root / size_name / relative_path
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
            logging.error("Erreur lors du redimensionnement de %s: %s", src_image, e)
