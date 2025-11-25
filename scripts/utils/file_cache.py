"""
File caching system for incremental builds.

Tracks file modifications using MD5 checksums to avoid
unnecessary reprocessing during development.
"""

import hashlib
import json
import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Set

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Represents a cached file entry."""

    path: str
    checksum: str
    size: int
    mtime: float
    processed_at: str


class FileCache:
    """
    MD5-based file cache for incremental builds.

    Tracks which files have been processed and their checksums
    to avoid reprocessing unchanged files.
    """

    CACHE_VERSION = "1.0"
    DEFAULT_CACHE_FILE = ".idoine_cache.json"

    def __init__(
        self,
        cache_dir: Optional[Path] = None,
        cache_file: Optional[str] = None,
    ):
        """
        Initialize the FileCache.

        Args:
            cache_dir: Directory for cache file. Default: current directory.
            cache_file: Cache filename. Default: .idoine_cache.json
        """
        self.cache_dir = Path(cache_dir) if cache_dir else Path.cwd()
        self.cache_file = cache_file or self.DEFAULT_CACHE_FILE
        self.cache_path = self.cache_dir / self.cache_file
        self._cache: Dict[str, CacheEntry] = {}
        self._dirty = False
        self._load()

    def _load(self) -> None:
        """Load cache from disk."""
        if not self.cache_path.exists():
            return

        try:
            with open(self.cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Check version compatibility
            if data.get("version") != self.CACHE_VERSION:
                logger.info("Cache version mismatch, starting fresh")
                return

            entries = data.get("entries", {})
            for key, entry_data in entries.items():
                self._cache[key] = CacheEntry(**entry_data)

            logger.debug(f"Loaded {len(self._cache)} cache entries")

        except Exception as e:
            logger.warning(f"Could not load cache: {e}")

    def save(self) -> None:
        """Save cache to disk."""
        if not self._dirty:
            return

        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

            data = {
                "version": self.CACHE_VERSION,
                "updated_at": datetime.now().isoformat(),
                "entries": {k: asdict(v) for k, v in self._cache.items()},
            }

            with open(self.cache_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            self._dirty = False
            logger.debug(f"Saved {len(self._cache)} cache entries")

        except Exception as e:
            logger.warning(f"Could not save cache: {e}")

    @staticmethod
    def compute_checksum(path: Path, chunk_size: int = 1024 * 1024) -> str:
        """
        Compute MD5 checksum of a file.

        Args:
            path: File path.
            chunk_size: Read chunk size in bytes.

        Returns:
            Hexadecimal MD5 digest string.
        """
        hasher = hashlib.md5()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(chunk_size), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _make_key(self, path: Path) -> str:
        """Create a cache key from a path."""
        return str(path.resolve())

    def get_entry(self, path: Path) -> Optional[CacheEntry]:
        """Get cache entry for a file."""
        return self._cache.get(self._make_key(path))

    def is_modified(self, path: Path) -> bool:
        """
        Check if a file has been modified since last cached.

        Uses a two-stage check:
        1. Fast check using size and mtime
        2. Slower checksum verification if fast check passes

        Args:
            path: File path to check.

        Returns:
            True if file is new or modified, False if unchanged.
        """
        path = Path(path)
        if not path.exists():
            return True

        key = self._make_key(path)
        entry = self._cache.get(key)

        if entry is None:
            return True

        try:
            stat = path.stat()

            # Fast check: size changed?
            if stat.st_size != entry.size:
                return True

            # Fast check: mtime changed?
            if stat.st_mtime != entry.mtime:
                # mtime changed, verify with checksum
                current_checksum = self.compute_checksum(path)
                return current_checksum != entry.checksum

            # Size and mtime match, assume unchanged
            return False

        except Exception:
            return True

    def update(self, path: Path) -> CacheEntry:
        """
        Update cache entry for a file.

        Args:
            path: File path to cache.

        Returns:
            The new CacheEntry.
        """
        path = Path(path)
        stat = path.stat()

        entry = CacheEntry(
            path=str(path),
            checksum=self.compute_checksum(path),
            size=stat.st_size,
            mtime=stat.st_mtime,
            processed_at=datetime.now().isoformat(),
        )

        self._cache[self._make_key(path)] = entry
        self._dirty = True
        return entry

    def remove(self, path: Path) -> bool:
        """
        Remove a file from cache.

        Args:
            path: File path to remove.

        Returns:
            True if entry was removed, False if not found.
        """
        key = self._make_key(path)
        if key in self._cache:
            del self._cache[key]
            self._dirty = True
            return True
        return False

    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
        self._dirty = True

    def get_modified_files(self, paths: Set[Path]) -> Set[Path]:
        """
        Filter a set of paths to only those that have been modified.

        Args:
            paths: Set of file paths to check.

        Returns:
            Set of paths that are new or modified.
        """
        return {p for p in paths if self.is_modified(p)}

    def prune_missing(self) -> int:
        """
        Remove cache entries for files that no longer exist.

        Returns:
            Number of entries removed.
        """
        to_remove = []
        for key, entry in self._cache.items():
            if not Path(entry.path).exists():
                to_remove.append(key)

        for key in to_remove:
            del self._cache[key]

        if to_remove:
            self._dirty = True

        return len(to_remove)

    def __enter__(self) -> "FileCache":
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Context manager exit - save cache."""
        self.save()

    def __len__(self) -> int:
        """Return number of cache entries."""
        return len(self._cache)


def needs_rebuild(
    src_path: Path,
    dest_path: Path,
    cache: Optional[FileCache] = None,
) -> bool:
    """
    Check if a destination file needs to be rebuilt.

    Args:
        src_path: Source file path.
        dest_path: Destination file path.
        cache: Optional FileCache instance for checksum tracking.

    Returns:
        True if rebuild is needed, False otherwise.
    """
    # Destination doesn't exist - needs rebuild
    if not dest_path.exists():
        return True

    # Source doesn't exist - can't rebuild
    if not src_path.exists():
        return False

    # Use cache if available
    if cache is not None:
        return cache.is_modified(src_path)

    # Fallback to mtime comparison
    return src_path.stat().st_mtime > dest_path.stat().st_mtime

