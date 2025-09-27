import errno
import hashlib
import os
import shutil
import stat
from pathlib import Path


class StaticFileManager:
    def __init__(self, src_path, dist_path):
        self.src_path = src_path
        self.dist_path = dist_path

    def handle_remove_readonly(self, func, path, exc_info):
        exc_value = exc_info[1]
        if func in (os.rmdir, os.remove, os.unlink) and exc_value.errno == errno.EACCES:
            os.chmod(path, stat.S_IWRITE)
            func(path)
        else:
            raise

    def setup_output_dir(self):
        if self.dist_path.exists():
            shutil.rmtree(self.dist_path, onerror=self.handle_remove_readonly)
        self.dist_path.mkdir(parents=True)

    def _file_checksum(self, path: Path, chunk_size: int = 1024 * 1024) -> str:
        h = hashlib.md5()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(chunk_size), b""):
                h.update(chunk)
        return h.hexdigest()

    def _needs_copy(self, src_file: Path, dst_file: Path) -> bool:
        if not dst_file.exists():
            return True
        if src_file.stat().st_size != dst_file.stat().st_size:
            return True
        # If sizes equal, compare checksums to avoid unnecessary copies
        try:
            return self._file_checksum(src_file) != self._file_checksum(dst_file)
        except Exception:
            # Fallback to mtime comparison on checksum error
            return src_file.stat().st_mtime > dst_file.stat().st_mtime

    def copy_static_files(self):
        """
        Incremental copy: copy only non-processed assets that changed since last build.
        Leaves styles and scripts to the frontend build (Grunt).
        """
        static_dirs = ["assets"]
        for dir_name in static_dirs:
            src_dir = self.src_path / dir_name
            if not src_dir.exists():
                continue
            dst_dir = self.dist_path / dir_name
            dst_dir.mkdir(parents=True, exist_ok=True)

            for root, _, files in os.walk(src_dir):
                rel_root = Path(root).relative_to(src_dir)
                out_root = dst_dir / rel_root
                out_root.mkdir(parents=True, exist_ok=True)
                for fname in files:
                    src_file = Path(root) / fname
                    dst_file = out_root / fname
                    if self._needs_copy(src_file, dst_file):
                        shutil.copy2(src_file, dst_file)
