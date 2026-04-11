"""
Unit tests for the path validator module.

These tests are critical for security as path validation
prevents path traversal attacks.
"""

from pathlib import Path

import pytest
from utils.path_validator import (
    PathValidationError,
    is_safe_path,
    safe_join,
    sanitize_filename,
    validate_content_path,
    validate_output_path,
    validate_path_within_base,
)


class TestValidatePathWithinBase:
    """Tests for the validate_path_within_base function."""

    def test_valid_relative_path(self, tmp_path: Path):
        """Test validating a valid relative path."""
        base = tmp_path / "project"
        base.mkdir()
        subdir = base / "subdir"
        subdir.mkdir()

        result = validate_path_within_base("subdir/file.txt", base)
        assert base in result.parents or result.parent == base

    def test_valid_absolute_path(self, tmp_path: Path):
        """Test validating a valid absolute path within base."""
        base = tmp_path / "project"
        base.mkdir()
        file_path = base / "file.txt"
        file_path.touch()

        result = validate_path_within_base(file_path, base)
        assert result == file_path.resolve()

    def test_path_traversal_attack_dotdot(self, tmp_path: Path):
        """Test that path traversal with .. is blocked."""
        base = tmp_path / "project"
        base.mkdir()

        with pytest.raises(PathValidationError):
            validate_path_within_base("../etc/passwd", base)

    def test_path_traversal_attack_multiple_dotdot(self, tmp_path: Path):
        """Test that multiple .. path traversal is blocked."""
        base = tmp_path / "project" / "subdir"
        base.mkdir(parents=True)

        with pytest.raises(PathValidationError):
            validate_path_within_base("../../etc/passwd", base)

    def test_path_traversal_in_middle(self, tmp_path: Path):
        """Test that path traversal in middle of path is blocked."""
        base = tmp_path / "project"
        base.mkdir()

        with pytest.raises(PathValidationError):
            validate_path_within_base("subdir/../../../etc/passwd", base)

    def test_absolute_path_outside_base(self, tmp_path: Path):
        """Test that absolute path outside base is blocked."""
        base = tmp_path / "project"
        base.mkdir()
        outside = tmp_path / "outside"
        outside.mkdir()

        with pytest.raises(PathValidationError):
            validate_path_within_base(outside, base)


class TestSafeJoin:
    """Tests for the safe_join function."""

    def test_safe_join_valid(self, tmp_path: Path):
        """Test safe joining of path components."""
        result = safe_join(tmp_path, "subdir", "file.txt")
        assert result == (tmp_path / "subdir" / "file.txt").resolve()

    def test_safe_join_blocks_traversal(self, tmp_path: Path):
        """Test that safe_join blocks path traversal."""
        with pytest.raises(PathValidationError):
            safe_join(tmp_path, "..", "etc", "passwd")

    def test_safe_join_multiple_components(self, tmp_path: Path):
        """Test safe joining with multiple components."""
        result = safe_join(tmp_path, "a", "b", "c", "file.txt")
        assert "a" in str(result)
        assert "b" in str(result)
        assert "c" in str(result)


class TestIsSafePath:
    """Tests for the is_safe_path function."""

    def test_safe_path_returns_true(self, tmp_path: Path):
        """Test that safe paths return True."""
        assert is_safe_path("subdir/file.txt", tmp_path) is True

    def test_unsafe_path_returns_false(self, tmp_path: Path):
        """Test that unsafe paths return False."""
        assert is_safe_path("../etc/passwd", tmp_path) is False

    def test_absolute_path_outside_returns_false(self, tmp_path: Path):
        """Test that absolute path outside base returns False."""
        outside = tmp_path.parent / "outside"
        assert is_safe_path(outside, tmp_path) is False


class TestSanitizeFilename:
    """Tests for the sanitize_filename function."""

    def test_remove_path_separator_forward(self):
        """Test removing forward slash from filename."""
        result = sanitize_filename("path/to/file.txt")
        assert "/" not in result

    def test_remove_path_separator_backward(self):
        """Test removing backslash from filename."""
        result = sanitize_filename("path\\to\\file.txt")
        assert "\\" not in result

    def test_remove_dotdot(self):
        """Test removing .. from filename."""
        result = sanitize_filename("../etc/passwd")
        assert ".." not in result

    def test_remove_dangerous_chars(self):
        """Test removing dangerous characters."""
        result = sanitize_filename('file<name>:with"special|chars?.txt')
        assert "<" not in result
        assert ">" not in result
        assert ":" not in result
        assert '"' not in result
        assert "|" not in result
        assert "?" not in result

    def test_remove_asterisk(self):
        """Test removing asterisk from filename."""
        result = sanitize_filename("file*.txt")
        assert "*" not in result

    def test_remove_null_byte(self):
        """Test removing null byte from filename."""
        result = sanitize_filename("file\x00.txt")
        assert "\x00" not in result

    def test_strip_leading_trailing_dots(self):
        """Test stripping leading/trailing dots."""
        result = sanitize_filename("...file.txt...")
        assert not result.startswith(".")
        assert not result.endswith(".")

    def test_strip_leading_trailing_spaces(self):
        """Test stripping leading/trailing spaces."""
        result = sanitize_filename("  file.txt  ")
        assert not result.startswith(" ")
        assert not result.endswith(" ")

    def test_empty_result_returns_unnamed(self):
        """Test that empty result returns 'unnamed'."""
        result = sanitize_filename("...")
        assert result == "unnamed"

    def test_valid_filename_unchanged(self):
        """Test that valid filename is unchanged."""
        result = sanitize_filename("valid-file_name.txt")
        assert result == "valid-file_name.txt"


class TestValidateContentPath:
    """Tests for the validate_content_path function."""

    def test_valid_content_path(self, tmp_path: Path):
        """Test validating a valid content path."""
        src = tmp_path / "src"
        (src / "locales").mkdir(parents=True)

        result = validate_content_path("locales/fr/pages/home.md", src)
        assert "locales" in str(result)

    def test_content_path_in_allowed_dir(self, tmp_path: Path):
        """Test that path in allowed directory is valid."""
        src = tmp_path / "src"
        (src / "templates").mkdir(parents=True)

        result = validate_content_path("templates/base.html", src)
        assert "templates" in str(result)

    def test_content_path_outside_src(self, tmp_path: Path):
        """Test that path outside src is rejected."""
        src = tmp_path / "src"
        src.mkdir()

        with pytest.raises(PathValidationError):
            validate_content_path("../secret/file.txt", src)

    def test_content_path_not_in_allowed_dirs(self, tmp_path: Path):
        """Test that path not in allowed directories is rejected."""
        src = tmp_path / "src"
        (src / "forbidden").mkdir(parents=True)

        with pytest.raises(PathValidationError):
            validate_content_path("forbidden/file.txt", src)

    def test_content_path_custom_allowed_dirs(self, tmp_path: Path):
        """Test with custom allowed directories."""
        src = tmp_path / "src"
        (src / "custom").mkdir(parents=True)

        result = validate_content_path(
            "custom/file.txt",
            src,
            allowed_dirs=["custom"],
        )
        assert "custom" in str(result)

    def test_absolute_content_path(self, tmp_path: Path):
        """Test with absolute content path."""
        src = tmp_path / "src"
        (src / "locales").mkdir(parents=True)
        file_path = src / "locales" / "test.md"

        result = validate_content_path(file_path, src)
        assert result == file_path.resolve()


class TestValidateOutputPath:
    """Tests for the validate_output_path function."""

    def test_valid_output_path(self, tmp_path: Path):
        """Test validating a valid output path."""
        dist = tmp_path / "dist"
        dist.mkdir()

        result = validate_output_path("fr/blog/post/index.html", dist)
        assert "dist" in str(result)

    def test_output_path_traversal_blocked(self, tmp_path: Path):
        """Test that output path traversal is blocked."""
        dist = tmp_path / "dist"
        dist.mkdir()

        with pytest.raises(PathValidationError):
            validate_output_path("../etc/passwd", dist)

    def test_absolute_output_path_outside(self, tmp_path: Path):
        """Test that absolute path outside dist is blocked."""
        dist = tmp_path / "dist"
        dist.mkdir()
        outside = tmp_path / "outside"

        with pytest.raises(PathValidationError):
            validate_output_path(outside, dist)


class TestPathValidationError:
    """Tests for the PathValidationError exception."""

    def test_exception_message(self):
        """Test exception message."""
        error = PathValidationError("Test error message")
        assert str(error) == "Test error message"

    def test_exception_is_exception(self):
        """Test that PathValidationError is an Exception."""
        error = PathValidationError("Test")
        assert isinstance(error, Exception)


class TestEdgeCases:
    """Tests for edge cases in path validation."""

    def test_empty_path(self, tmp_path: Path):
        """Test handling of empty path."""
        # Empty string should resolve to base path
        result = validate_path_within_base("", tmp_path)
        assert result == tmp_path.resolve()

    def test_dot_path(self, tmp_path: Path):
        """Test handling of single dot path."""
        result = validate_path_within_base(".", tmp_path)
        assert result == tmp_path.resolve()

    def test_deeply_nested_path(self, tmp_path: Path):
        """Test deeply nested valid path."""
        result = validate_path_within_base(
            "a/b/c/d/e/f/g/h/file.txt",
            tmp_path,
        )
        assert "a" in str(result)
        assert "file.txt" in str(result)

    def test_unicode_in_path(self, tmp_path: Path):
        """Test Unicode characters in path."""
        result = validate_path_within_base(
            "dossier/fichier-éàü.txt",
            tmp_path,
        )
        assert "éàü" in str(result)
