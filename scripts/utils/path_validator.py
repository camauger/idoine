"""
Path validation utilities to prevent path traversal attacks.

This module provides functions to validate and sanitize file paths,
ensuring they stay within allowed directories.
"""

import logging
from pathlib import Path
from typing import Optional, Union

logger = logging.getLogger(__name__)


class PathValidationError(Exception):
    """Raised when a path fails validation."""

    pass


def validate_path_within_base(
    path: Union[str, Path],
    base_path: Union[str, Path],
    resolve: bool = True,
) -> Path:
    """
    Validate that a path is within a base directory.

    Prevents path traversal attacks by ensuring the resolved path
    stays within the allowed base directory.

    Args:
        path: The path to validate.
        base_path: The base directory that path must be within.
        resolve: Whether to resolve symlinks. Default True for security.

    Returns:
        The validated Path object.

    Raises:
        PathValidationError: If path escapes the base directory.

    Examples:
        >>> validate_path_within_base("subdir/file.txt", "/home/user/project")
        PosixPath('/home/user/project/subdir/file.txt')

        >>> validate_path_within_base("../etc/passwd", "/home/user/project")
        PathValidationError: Path escapes base directory
    """
    path = Path(path)
    base_path = Path(base_path)

    if resolve:
        # Resolve to absolute path, following symlinks
        resolved_base = base_path.resolve()
        # For relative paths, join with base first
        if not path.is_absolute():
            resolved_path = (base_path / path).resolve()
        else:
            resolved_path = path.resolve()
    else:
        resolved_base = base_path.absolute()
        if not path.is_absolute():
            resolved_path = (base_path / path).absolute()
        else:
            resolved_path = path.absolute()

    # Check if the resolved path is within the base directory
    try:
        resolved_path.relative_to(resolved_base)
    except ValueError:
        raise PathValidationError(
            f"Path '{path}' escapes base directory '{base_path}'"
        )

    return resolved_path


def safe_join(
    base_path: Union[str, Path],
    *parts: Union[str, Path],
) -> Path:
    """
    Safely join path components, validating the result.

    Args:
        base_path: The base directory.
        *parts: Path components to join.

    Returns:
        The joined and validated Path.

    Raises:
        PathValidationError: If resulting path escapes base directory.

    Examples:
        >>> safe_join("/home/user", "subdir", "file.txt")
        PosixPath('/home/user/subdir/file.txt')
    """
    base_path = Path(base_path)
    joined = base_path.joinpath(*parts)
    return validate_path_within_base(joined, base_path)


def is_safe_path(
    path: Union[str, Path],
    base_path: Union[str, Path],
) -> bool:
    """
    Check if a path is safely within a base directory.

    Args:
        path: The path to check.
        base_path: The base directory.

    Returns:
        True if path is within base_path, False otherwise.
    """
    try:
        validate_path_within_base(path, base_path)
        return True
    except PathValidationError:
        return False


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename by removing potentially dangerous characters.

    Args:
        filename: The filename to sanitize.

    Returns:
        Sanitized filename safe for filesystem use.

    Examples:
        >>> sanitize_filename("../etc/passwd")
        'etc_passwd'

        >>> sanitize_filename("file<name>.txt")
        'filename.txt'
    """
    # Characters that are dangerous on various filesystems
    dangerous_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*', '\0']

    # Replace dangerous characters
    result = filename
    for char in dangerous_chars:
        result = result.replace(char, '_')

    # Remove leading/trailing dots and spaces
    result = result.strip('. ')

    # Handle .. sequences
    while '..' in result:
        result = result.replace('..', '_')

    # Ensure we have something left
    if not result:
        result = 'unnamed'

    return result


def validate_content_path(
    content_path: Union[str, Path],
    src_path: Union[str, Path],
    allowed_dirs: Optional[list] = None,
) -> Path:
    """
    Validate a content file path for the static site generator.

    Args:
        content_path: Path to the content file.
        src_path: The source directory root.
        allowed_dirs: Optional list of allowed subdirectories.
                      Default: ["locales", "config", "data", "templates", "assets"]

    Returns:
        Validated absolute Path.

    Raises:
        PathValidationError: If path is invalid or outside allowed directories.
    """
    if allowed_dirs is None:
        allowed_dirs = ["locales", "config", "data", "templates", "assets"]

    src_path = Path(src_path).resolve()
    content_path = Path(content_path)

    # If relative, make it relative to src
    if not content_path.is_absolute():
        full_path = (src_path / content_path).resolve()
    else:
        full_path = content_path.resolve()

    # Must be within src_path
    try:
        relative = full_path.relative_to(src_path)
    except ValueError:
        raise PathValidationError(
            f"Content path '{content_path}' is outside source directory"
        )

    # Check if it's in an allowed subdirectory
    if allowed_dirs:
        parts = relative.parts
        if parts and parts[0] not in allowed_dirs:
            raise PathValidationError(
                f"Content path '{content_path}' is not in allowed directories: {allowed_dirs}"
            )

    return full_path


def validate_output_path(
    output_path: Union[str, Path],
    dist_path: Union[str, Path],
) -> Path:
    """
    Validate an output file path for the static site generator.

    Args:
        output_path: Path where output will be written.
        dist_path: The distribution directory root.

    Returns:
        Validated absolute Path.

    Raises:
        PathValidationError: If path escapes the dist directory.
    """
    return validate_path_within_base(output_path, dist_path)

