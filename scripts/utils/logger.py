"""
Configurable logging system for the IDOINE static site generator.

Provides a logger that can toggle emoji icons based on
environment variables or configuration.
"""

import io
import logging
import os
import sys
from typing import Optional

from .constants import (
    ICON_BUILD,
    ICON_CATEGORY,
    ICON_CLEAN,
    ICON_COPY,
    ICON_ERROR,
    ICON_GLOSSARY,
    ICON_PAGE,
    ICON_PAGINATION,
    ICON_REDIRECT,
    ICON_START,
    ICON_SUCCESS,
    ICON_TAG,
)


class IconFormatter(logging.Formatter):
    """
    Custom formatter that can include or exclude emoji icons.

    Icons are enabled by default but can be disabled via:
    - Environment variable: IDOINE_USE_ICONS=false
    - Constructor parameter: use_icons=False
    """

    # Icon mapping for messages that should have icons
    ICON_MAP = {
        "start": ICON_START,
        "clean": ICON_CLEAN,
        "copy": ICON_COPY,
        "build": ICON_BUILD,
        "glossary": ICON_GLOSSARY,
        "category": ICON_CATEGORY,
        "redirect": ICON_REDIRECT,
        "success": ICON_SUCCESS,
        "error": ICON_ERROR,
        "tag": ICON_TAG,
        "page": ICON_PAGE,
        "pagination": ICON_PAGINATION,
    }

    def __init__(
        self,
        fmt: Optional[str] = None,
        datefmt: Optional[str] = None,
        use_icons: Optional[bool] = None,
    ):
        """
        Initialize the IconFormatter.

        Args:
            fmt: Log message format string.
            datefmt: Date format string.
            use_icons: Whether to include icons. None = check environment.
        """
        super().__init__(fmt, datefmt)

        if use_icons is None:
            # Check environment variable
            env_value = os.environ.get("IDOINE_USE_ICONS", "").lower()
            self.use_icons = env_value not in ("false", "0", "no", "off")
        else:
            self.use_icons = use_icons

    def format(self, record: logging.LogRecord) -> str:
        """Format the log record, optionally stripping icons."""
        message = super().format(record)

        if not self.use_icons:
            # Remove icons from the message
            for icon in self.ICON_MAP.values():
                message = message.replace(icon, "").replace("  ", " ")

        return message


class IdoineLogger:
    """
    Configurable logger for the IDOINE build system.

    Provides convenient methods for logging with icons and
    respects the IDOINE_USE_ICONS environment variable.
    """

    def __init__(
        self,
        name: str = "idoine",
        level: int = logging.INFO,
        use_icons: Optional[bool] = None,
    ):
        """
        Initialize the IdoineLogger.

        Args:
            name: Logger name.
            level: Logging level.
            use_icons: Whether to use icons. None = check environment.
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)

        if use_icons is None:
            env_value = os.environ.get("IDOINE_USE_ICONS", "").lower()
            self.use_icons = env_value not in ("false", "0", "no", "off")
        else:
            self.use_icons = use_icons

        # Clear existing handlers
        self.logger.handlers.clear()

        # Create handler with custom formatter
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)

        formatter = IconFormatter(
            fmt="[%(asctime)s] %(levelname)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            use_icons=self.use_icons,
        )
        handler.setFormatter(formatter)

        self.logger.addHandler(handler)

    def _icon(self, key: str) -> str:
        """Get icon if icons are enabled."""
        if self.use_icons:
            return IconFormatter.ICON_MAP.get(key, "") + " "
        return ""

    def start(self, msg: str) -> None:
        """Log a start message."""
        self.logger.info(f"{self._icon('start')}{msg}")

    def clean(self, msg: str) -> None:
        """Log a clean message."""
        self.logger.info(f"{self._icon('clean')}{msg}")

    def copy(self, msg: str) -> None:
        """Log a copy message."""
        self.logger.info(f"{self._icon('copy')}{msg}")

    def build(self, msg: str) -> None:
        """Log a build message."""
        self.logger.info(f"{self._icon('build')}{msg}")

    def glossary(self, msg: str) -> None:
        """Log a glossary message."""
        self.logger.info(f"{self._icon('glossary')}{msg}")

    def category(self, msg: str) -> None:
        """Log a category message."""
        self.logger.info(f"{self._icon('category')}{msg}")

    def redirect(self, msg: str) -> None:
        """Log a redirect message."""
        self.logger.info(f"{self._icon('redirect')}{msg}")

    def success(self, msg: str) -> None:
        """Log a success message."""
        self.logger.info(f"{self._icon('success')}{msg}")

    def tag(self, msg: str) -> None:
        """Log a tag message."""
        self.logger.info(f"{self._icon('tag')}{msg}")

    def page(self, msg: str) -> None:
        """Log a page message."""
        self.logger.info(f"{self._icon('page')}{msg}")

    def pagination(self, msg: str) -> None:
        """Log a pagination message."""
        self.logger.info(f"{self._icon('pagination')}{msg}")

    def error(self, msg: str, exc_info: bool = False) -> None:
        """Log an error message."""
        self.logger.error(f"{self._icon('error')}{msg}", exc_info=exc_info)

    def warning(self, msg: str) -> None:
        """Log a warning message."""
        self.logger.warning(msg)

    def info(self, msg: str) -> None:
        """Log an info message."""
        self.logger.info(msg)

    def debug(self, msg: str) -> None:
        """Log a debug message."""
        self.logger.debug(msg)


# Global logger instance
_logger: Optional[IdoineLogger] = None


def get_logger(
    name: str = "idoine",
    level: int = logging.INFO,
    use_icons: Optional[bool] = None,
) -> IdoineLogger:
    """
    Get or create the global IdoineLogger instance.

    Args:
        name: Logger name.
        level: Logging level.
        use_icons: Whether to use icons.

    Returns:
        The IdoineLogger instance.
    """
    global _logger
    if _logger is None:
        _logger = IdoineLogger(name, level, use_icons)
    return _logger


def setup_logging(
    level: int = logging.INFO,
    use_icons: Optional[bool] = None,
) -> None:
    """
    Configure the root logger with IDOINE formatting.

    Args:
        level: Logging level.
        use_icons: Whether to use icons. None = check environment.
    """
    # Ensure UTF-8 encoding for stdout/stderr
    if isinstance(sys.stdout, io.TextIOWrapper) and isinstance(
        sys.stderr, io.TextIOWrapper
    ):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except (OSError, AttributeError):
            pass

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Clear existing handlers
    root_logger.handlers.clear()

    # Create handler with custom formatter
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = IconFormatter(
        fmt="[%(asctime)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        use_icons=use_icons,
    )
    handler.setFormatter(formatter)

    root_logger.addHandler(handler)
