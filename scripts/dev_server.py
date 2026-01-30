#!/usr/bin/env python
"""
Development server with hot reload for IDOINE.

Provides a standalone Python development server with:
- HTTP server for serving the dist directory
- File watching with automatic rebuild on changes
- Live reload support via WebSocket

Usage:
    python scripts/dev_server.py [--port 8000] [--no-reload]
"""

import argparse
import http.server
import logging
import os
import socketserver
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Callable, List, Optional, Set

# Add scripts directory to path
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from utils.logger import setup_logging

logger = logging.getLogger(__name__)


class LiveReloadHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that serves files and injects live reload script."""

    def __init__(
        self,
        *args,
        directory: Optional[str] = None,
        inject_reload: bool = True,
        **kwargs,
    ):
        self.inject_reload = inject_reload
        super().__init__(*args, directory=directory, **kwargs)

    def end_headers(self):
        # Add CORS headers for development
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        # Inject live reload script into HTML responses
        if self.inject_reload and self.path.endswith((".html", "/")):
            return self._serve_with_reload()
        return super().do_GET()

    def _serve_with_reload(self):
        """Serve HTML with injected live reload script."""
        # Get the file path
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")

        if not os.path.exists(path):
            self.send_error(404, "File not found")
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            # Inject live reload script before </body>
            reload_script = """
<script>
(function() {
    var lastCheck = Date.now();
    var checkInterval = 1000;

    function checkForChanges() {
        fetch('/__reload_check?t=' + lastCheck)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.reload) {
                    console.log('[LiveReload] Changes detected, reloading...');
                    location.reload();
                }
                lastCheck = Date.now();
            })
            .catch(function() {})
            .finally(function() {
                setTimeout(checkForChanges, checkInterval);
            });
    }

    console.log('[LiveReload] Active');
    setTimeout(checkForChanges, checkInterval);
})();
</script>
"""
            if "</body>" in content:
                content = content.replace("</body>", reload_script + "</body>")
            elif "</html>" in content:
                content = content.replace("</html>", reload_script + "</html>")

            encoded = content.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.send_header("Content-Length", len(encoded))
            self.end_headers()
            self.wfile.write(encoded)

        except Exception as e:
            logger.error(f"Error serving {path}: {e}")
            self.send_error(500, str(e))

    def log_message(self, format, *args):
        # Suppress default logging, use our logger
        if "/__reload_check" not in args[0]:
            logger.debug(f"{self.address_string()} - {format % args}")


class ReloadCheckHandler(LiveReloadHandler):
    """Handler that also responds to reload check requests."""

    last_build_time: float = 0

    def do_GET(self):
        if self.path.startswith("/__reload_check"):
            self._handle_reload_check()
        else:
            super().do_GET()

    def _handle_reload_check(self):
        """Handle reload check API request."""
        import json

        # Check if we should reload
        should_reload = ReloadCheckHandler.last_build_time > 0

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

        response = json.dumps(
            {"reload": should_reload, "timestamp": ReloadCheckHandler.last_build_time}
        )

        # Reset after reporting
        if should_reload:
            ReloadCheckHandler.last_build_time = 0

        self.wfile.write(response.encode())


class FileWatcher:
    """
    Watches files for changes and triggers callbacks.

    Uses polling-based watching for cross-platform compatibility.
    For better performance, install watchdog: pip install watchdog
    """

    def __init__(
        self,
        paths: List[Path],
        patterns: List[str],
        callback: Callable[[], None],
        debounce: float = 0.5,
    ):
        """
        Initialize the FileWatcher.

        Args:
            paths: Directories to watch.
            patterns: Glob patterns to match (e.g., "*.md", "*.html").
            callback: Function to call when changes detected.
            debounce: Seconds to wait before triggering callback.
        """
        self.paths = [Path(p) for p in paths]
        self.patterns = patterns
        self.callback = callback
        self.debounce = debounce
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._file_times: dict = {}
        self._last_callback = 0

    def start(self):
        """Start watching for changes."""
        self._running = True
        self._scan_files()  # Initial scan
        self._thread = threading.Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        logger.info("File watcher started")

    def stop(self):
        """Stop watching for changes."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        logger.info("File watcher stopped")

    def _scan_files(self) -> Set[Path]:
        """Scan all watched files and return the set."""
        files = set()
        for base_path in self.paths:
            if not base_path.exists():
                continue
            for pattern in self.patterns:
                for file_path in base_path.glob(f"**/{pattern}"):
                    if file_path.is_file():
                        files.add(file_path)
        return files

    def _get_file_times(self, files: Set[Path]) -> dict:
        """Get modification times for all files."""
        times = {}
        for f in files:
            try:
                times[f] = f.stat().st_mtime
            except (OSError, FileNotFoundError):
                pass
        return times

    def _watch_loop(self):
        """Main watch loop."""
        while self._running:
            try:
                files = self._scan_files()
                new_times = self._get_file_times(files)

                # Check for changes
                changed = False
                for f, mtime in new_times.items():
                    if f not in self._file_times or self._file_times[f] != mtime:
                        if f in self._file_times:
                            logger.info(f"Changed: {f.name}")
                        changed = True

                # Check for deleted files
                for f in set(self._file_times.keys()) - set(new_times.keys()):
                    logger.info(f"Deleted: {f.name}")
                    changed = True

                self._file_times = new_times

                # Trigger callback with debounce
                if changed:
                    now = time.time()
                    if now - self._last_callback > self.debounce:
                        self._last_callback = now
                        self.callback()

            except Exception as e:
                logger.error(f"Watch error: {e}")

            time.sleep(0.5)


class DevServer:
    """
    Development server with hot reload.

    Combines HTTP server with file watching for automatic rebuilds.
    """

    def __init__(
        self,
        src_path: Path,
        dist_path: Path,
        port: int = 8000,
        host: str = "localhost",
        auto_reload: bool = True,
    ):
        """
        Initialize the DevServer.

        Args:
            src_path: Source directory to watch.
            dist_path: Distribution directory to serve.
            port: Port number for HTTP server.
            host: Host to bind to.
            auto_reload: Enable automatic rebuild on changes.
        """
        self.src_path = Path(src_path)
        self.dist_path = Path(dist_path)
        self.port = port
        self.host = host
        self.auto_reload = auto_reload
        self._server: Optional[socketserver.TCPServer] = None
        self._watcher: Optional[FileWatcher] = None

    def _rebuild(self):
        """Trigger a rebuild of the site."""
        logger.info("🔄 Rebuilding site...")
        try:
            # Run the build script
            build_script = scripts_dir / "core" / "build.py"
            result = subprocess.run(
                [sys.executable, str(build_script), "--build"],
                capture_output=True,
                text=True,
                cwd=str(self.src_path.parent),
            )

            if result.returncode == 0:
                logger.info("✅ Rebuild complete")
                # Signal live reload
                ReloadCheckHandler.last_build_time = time.time()
            else:
                logger.error(f"❌ Build failed:\n{result.stderr}")

        except Exception as e:
            logger.error(f"❌ Build error: {e}")

    def start(self):
        """Start the development server."""
        # Ensure dist directory exists
        if not self.dist_path.exists():
            logger.info("Running initial build...")
            self._rebuild()

        # Set up file watcher
        if self.auto_reload:
            watch_paths = [
                self.src_path / "locales",
                self.src_path / "templates",
                self.src_path / "config",
                self.src_path / "data",
            ]
            watch_patterns = ["*.md", "*.html", "*.yaml", "*.yml", "*.jinja2"]

            self._watcher = FileWatcher(
                paths=watch_paths,
                patterns=watch_patterns,
                callback=self._rebuild,
                debounce=0.5,
            )
            self._watcher.start()

        # Set up HTTP server
        os.chdir(self.dist_path)

        handler = ReloadCheckHandler
        handler.extensions_map.update(
            {
                ".js": "application/javascript",
                ".css": "text/css",
                ".svg": "image/svg+xml",
                ".woff2": "font/woff2",
            }
        )

        # Allow reuse of address
        socketserver.TCPServer.allow_reuse_address = True

        try:
            self._server = socketserver.TCPServer((self.host, self.port), handler)
            logger.info(
                f"🚀 Development server running at http://{self.host}:{self.port}/"
            )
            logger.info("Press Ctrl+C to stop")

            if self.auto_reload:
                logger.info("📁 Watching for changes...")

            self._server.serve_forever()

        except KeyboardInterrupt:
            logger.info("\n🛑 Shutting down...")
        finally:
            self.stop()

    def stop(self):
        """Stop the development server."""
        if self._watcher:
            self._watcher.stop()
        if self._server:
            self._server.shutdown()


def main():
    """Main entry point for the development server."""
    parser = argparse.ArgumentParser(
        description="IDOINE Development Server with Hot Reload"
    )
    parser.add_argument(
        "--port",
        "-p",
        type=int,
        default=8000,
        help="Port to run server on (default: 8000)",
    )
    parser.add_argument(
        "--host", default="localhost", help="Host to bind to (default: localhost)"
    )
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable automatic reload on file changes",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose logging"
    )

    args = parser.parse_args()

    # Set up logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    setup_logging(level=log_level)

    # Determine paths
    base_path = scripts_dir.parent
    src_path = base_path / "src"
    dist_path = base_path / "dist"

    # Create and start server
    server = DevServer(
        src_path=src_path,
        dist_path=dist_path,
        port=args.port,
        host=args.host,
        auto_reload=not args.no_reload,
    )
    server.start()


if __name__ == "__main__":
    main()
