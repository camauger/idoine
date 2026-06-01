"""
Custom exceptions for the IDOINE static site generator.

Provides a hierarchy of exceptions for better error handling
and debugging throughout the build process.
"""

from pathlib import Path
from typing import Any, Optional


class IdoineError(Exception):
    """
    Base exception for all IDOINE errors.

    All custom exceptions inherit from this class,
    allowing catch-all error handling.
    """

    def __init__(self, message: str, details: Optional[str] = None):
        """
        Initialize the exception.

        Args:
            message: Short error message.
            details: Optional detailed information.
        """
        self.message = message
        self.details = details
        super().__init__(message)

    def __str__(self) -> str:
        if self.details:
            return f"{self.message}\nDetails: {self.details}"
        return self.message


class BuildError(IdoineError):
    """
    Exception raised during the build process.

    Used for errors that occur while building pages,
    posts, or other content.
    """

    def __init__(
        self,
        message: str,
        file_path: Optional[Path] = None,
        details: Optional[str] = None,
    ):
        """
        Initialize the BuildError.

        Args:
            message: Error message.
            file_path: Path to the file that caused the error.
            details: Additional details.
        """
        self.file_path = file_path
        full_message = message
        if file_path:
            full_message = f"{message} (file: {file_path})"
        super().__init__(full_message, details)


class ConfigError(IdoineError):
    """
    Exception raised for configuration errors.

    Used when site_config.yaml or other configuration
    files have invalid or missing values.
    """

    def __init__(
        self,
        message: str,
        config_file: Optional[str] = None,
        key: Optional[str] = None,
        details: Optional[str] = None,
    ):
        """
        Initialize the ConfigError.

        Args:
            message: Error message.
            config_file: Name of the configuration file.
            key: Configuration key that caused the error.
            details: Additional details.
        """
        self.config_file = config_file
        self.key = key

        full_message = message
        if config_file:
            full_message = f"{message} (config: {config_file})"
        if key:
            full_message = f"{full_message} (key: {key})"

        super().__init__(full_message, details)


class TemplateError(IdoineError):
    """
    Exception raised for template-related errors.

    Used when Jinja2 templates fail to render or have
    syntax errors.
    """

    def __init__(
        self,
        message: str,
        template_name: Optional[str] = None,
        line_number: Optional[int] = None,
        details: Optional[str] = None,
    ):
        """
        Initialize the TemplateError.

        Args:
            message: Error message.
            template_name: Name of the template file.
            line_number: Line number where error occurred.
            details: Additional details.
        """
        self.template_name = template_name
        self.line_number = line_number

        full_message = message
        if template_name:
            full_message = f"{message} (template: {template_name})"
        if line_number:
            full_message = f"{full_message} (line: {line_number})"

        super().__init__(full_message, details)


class ContentError(IdoineError):
    """
    Exception raised for content-related errors.

    Used when Markdown content or frontmatter is invalid.
    """

    def __init__(
        self,
        message: str,
        content_file: Optional[Path] = None,
        field: Optional[str] = None,
        details: Optional[str] = None,
    ):
        """
        Initialize the ContentError.

        Args:
            message: Error message.
            content_file: Path to the content file.
            field: Field name that caused the error.
            details: Additional details.
        """
        self.content_file = content_file
        self.field = field

        full_message = message
        if content_file:
            full_message = f"{message} (file: {content_file})"
        if field:
            full_message = f"{full_message} (field: {field})"

        super().__init__(full_message, details)


class PathError(IdoineError):
    """
    Exception raised for path-related errors.

    Used for path traversal attempts, missing files, or
    invalid paths.
    """

    def __init__(
        self,
        message: str,
        path: Optional[Path] = None,
        details: Optional[str] = None,
    ):
        """
        Initialize the PathError.

        Args:
            message: Error message.
            path: The problematic path.
            details: Additional details.
        """
        self.path = path
        full_message = message
        if path:
            full_message = f"{message} (path: {path})"
        super().__init__(full_message, details)


class ImageProcessingError(IdoineError):
    """
    Exception raised for image processing errors.

    Used when image optimization or resizing fails.
    """

    def __init__(
        self,
        message: str,
        image_path: Optional[Path] = None,
        details: Optional[str] = None,
    ):
        """
        Initialize the ImageProcessingError.

        Args:
            message: Error message.
            image_path: Path to the image file.
            details: Additional details.
        """
        self.image_path = image_path
        full_message = message
        if image_path:
            full_message = f"{message} (image: {image_path})"
        super().__init__(full_message, details)


def handle_build_error(
    error: Exception,
    context: Optional[str] = None,
    reraise: bool = True,
) -> None:
    """
    Handle a build error with consistent logging and optional re-raise.

    Args:
        error: The exception that was caught.
        context: Additional context about where the error occurred.
        reraise: Whether to re-raise the exception.

    Raises:
        BuildError: If reraise is True and error is not already an IdoineError.
    """
    import logging

    logger = logging.getLogger(__name__)

    message = str(error)
    if context:
        message = f"{context}: {message}"

    if isinstance(error, IdoineError):
        logger.error(message)
        if reraise:
            raise
    else:
        logger.error(message, exc_info=True)
        if reraise:
            raise BuildError(message, details=str(error.__class__.__name__))

