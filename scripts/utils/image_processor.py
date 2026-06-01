"""
Image processing utilities for the IDOINE static site generator.

Provides image optimization, resizing, and format conversion
using Pillow for better performance and smaller file sizes.
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, ImageOps

from .constants import IMAGE_QUALITY, IMAGE_SIZES, SUPPORTED_IMAGE_EXTENSIONS
from .path_validator import PathValidationError, validate_path_within_base

logger = logging.getLogger(__name__)


@dataclass
class ImageVariant:
    """Represents a processed image variant."""

    path: Path
    width: int
    height: int
    format: str
    size_bytes: int


class ImageProcessor:
    """
    Handles image optimization and responsive image generation.

    Generates multiple sizes and formats (including WebP) for
    responsive images with optimal compression.
    """

    def __init__(
        self,
        sizes: Optional[Dict[str, int]] = None,
        quality: Optional[Dict[str, int]] = None,
        generate_webp: bool = True,
    ):
        """
        Initialize the ImageProcessor.

        Args:
            sizes: Dictionary of size names to max widths.
                   Default: {"small": 300, "medium": 800, "large": 1200}
            quality: Dictionary of format names to quality values.
                     Default: {"jpeg": 85, "webp": 85, "avif": 80}
            generate_webp: Whether to generate WebP variants. Default True.
        """
        self.sizes = sizes or dict(IMAGE_SIZES)
        self.quality = quality or dict(IMAGE_QUALITY)
        self.generate_webp = generate_webp
        self.supported_extensions = SUPPORTED_IMAGE_EXTENSIONS

    def is_supported(self, path: Path) -> bool:
        """Check if the file is a supported image format."""
        return path.suffix.lower() in self.supported_extensions

    def _get_output_format(self, original_suffix: str) -> str:
        """Determine output format based on original extension."""
        suffix = original_suffix.lower()
        if suffix in (".jpg", ".jpeg"):
            return "JPEG"
        elif suffix == ".png":
            return "PNG"
        elif suffix == ".gif":
            return "GIF"
        elif suffix == ".webp":
            return "WEBP"
        else:
            return "JPEG"  # Default fallback

    def _get_quality(self, format_name: str) -> int:
        """Get quality setting for a format."""
        return self.quality.get(format_name.lower(), 85)

    def optimize_image(
        self,
        src_path: Path,
        dest_path: Path,
        max_width: Optional[int] = None,
        output_format: Optional[str] = None,
    ) -> Optional[ImageVariant]:
        """
        Optimize a single image with optional resizing.

        Args:
            src_path: Source image path.
            dest_path: Destination path for optimized image.
            max_width: Maximum width (height scales proportionally).
            output_format: Output format (JPEG, PNG, WEBP, etc.)

        Returns:
            ImageVariant with details about the processed image,
            or None if processing failed.
        """
        try:
            with Image.open(src_path) as img:
                # Handle EXIF orientation
                img = ImageOps.exif_transpose(img) or img

                # Convert to RGB for JPEG output (removes alpha channel)
                if output_format in ("JPEG", "WEBP") and img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                elif img.mode == "P":
                    img = img.convert("RGBA" if "transparency" in img.info else "RGB")

                # Create a copy for processing
                processed = img.copy()

                # Resize if max_width specified
                if max_width and processed.width > max_width:
                    ratio = max_width / processed.width
                    new_height = int(processed.height * ratio)
                    processed = processed.resize(
                        (max_width, new_height),
                        Image.Resampling.LANCZOS,
                    )

                # Ensure destination directory exists
                dest_path.parent.mkdir(parents=True, exist_ok=True)

                # Determine output format
                fmt = output_format or self._get_output_format(src_path.suffix)
                quality = self._get_quality(fmt)

                # Save with optimization
                save_kwargs: Dict[str, Any] = {"optimize": True}
                if fmt == "JPEG":
                    save_kwargs["quality"] = quality
                    save_kwargs["progressive"] = True
                elif fmt == "WEBP":
                    save_kwargs["quality"] = quality
                    save_kwargs["method"] = 6  # Higher = better compression, slower
                elif fmt == "PNG":
                    save_kwargs["compress_level"] = 9

                processed.save(dest_path, format=fmt, **save_kwargs)

                return ImageVariant(
                    path=dest_path,
                    width=processed.width,
                    height=processed.height,
                    format=fmt,
                    size_bytes=dest_path.stat().st_size,
                )

        except Exception as e:
            logger.error(f"Error processing image {src_path}: {e}")
            return None

    def generate_responsive_variants(
        self,
        src_path: Path,
        dest_dir: Path,
        base_name: Optional[str] = None,
    ) -> Dict[str, List[ImageVariant]]:
        """
        Generate responsive image variants in multiple sizes and formats.

        Args:
            src_path: Source image path.
            dest_dir: Base directory for output files.
            base_name: Base name for output files. Default: original filename stem.

        Returns:
            Dictionary mapping size names to lists of ImageVariant objects.
            Each size may have multiple formats (e.g., JPEG and WebP).
        """
        results: Dict[str, List[ImageVariant]] = {}

        if not self.is_supported(src_path):
            logger.warning(f"Unsupported image format: {src_path}")
            return results

        base_name = base_name or src_path.stem
        original_format = self._get_output_format(src_path.suffix)

        for size_name, max_width in self.sizes.items():
            variants = []
            size_dir = dest_dir / size_name

            # Generate in original format
            if original_format in ("JPEG", "PNG"):
                suffix = ".jpg" if original_format == "JPEG" else ".png"
                dest_path = size_dir / f"{base_name}{suffix}"

                variant = self.optimize_image(
                    src_path, dest_path, max_width, original_format
                )
                if variant:
                    variants.append(variant)

            # Generate WebP variant
            if self.generate_webp:
                webp_path = size_dir / f"{base_name}.webp"
                webp_variant = self.optimize_image(
                    src_path, webp_path, max_width, "WEBP"
                )
                if webp_variant:
                    variants.append(webp_variant)

            results[size_name] = variants

        return results

    def process_directory(
        self,
        src_dir: Path,
        dest_dir: Path,
        recursive: bool = True,
    ) -> Dict[Path, Dict[str, List[ImageVariant]]]:
        """
        Process all images in a directory.

        Args:
            src_dir: Source directory containing images.
            dest_dir: Destination directory for processed images.
            recursive: Whether to process subdirectories.

        Returns:
            Dictionary mapping source paths to their generated variants.
        """
        results: Dict[Path, Dict[str, List[ImageVariant]]] = {}

        src_dir = Path(src_dir).resolve()
        dest_dir = Path(dest_dir).resolve()

        pattern = "**/*" if recursive else "*"

        for src_path in src_dir.glob(pattern):
            if not src_path.is_file():
                continue

            if not self.is_supported(src_path):
                continue

            # Validate paths
            try:
                validate_path_within_base(src_path, src_dir)
            except PathValidationError as e:
                logger.warning(f"Skipping invalid source path: {e}")
                continue

            # Preserve directory structure
            relative_path = src_path.relative_to(src_dir)
            output_base = dest_dir / relative_path.parent

            variants = self.generate_responsive_variants(
                src_path, output_base, src_path.stem
            )

            if variants:
                results[src_path] = variants
                logger.info(f"Processed: {src_path.name}")

        return results


def optimize_gallery_images(
    images_dir: Path,
    dist_path: Path,
    sizes: Optional[Dict[str, int]] = None,
) -> None:
    """
    Convenience function to optimize gallery images.

    Args:
        images_dir: Directory containing source images.
        dist_path: Distribution directory root.
    """
    processor = ImageProcessor(sizes=sizes)
    target_dir = dist_path / "assets" / "gallery_images"
    processor.process_directory(images_dir, target_dir)
