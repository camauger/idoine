"""
Unit tests for the custom exceptions module.
"""

from pathlib import Path

import pytest
from utils.exceptions import (
    BuildError,
    ConfigError,
    ContentError,
    IdoineError,
    ImageProcessingError,
    PathError,
    TemplateError,
    handle_build_error,
)


class TestIdoineError:
    """Tests for the base IdoineError exception."""

    def test_basic_message(self):
        """Test exception with basic message."""
        error = IdoineError("Something went wrong")
        assert str(error) == "Something went wrong"
        assert error.message == "Something went wrong"

    def test_message_with_details(self):
        """Test exception with details."""
        error = IdoineError("Error occurred", details="Additional info here")
        assert "Error occurred" in str(error)
        assert "Additional info here" in str(error)
        assert error.details == "Additional info here"

    def test_none_details(self):
        """Test exception with no details."""
        error = IdoineError("Error")
        assert error.details is None
        assert str(error) == "Error"

    def test_is_exception(self):
        """Test that IdoineError is an Exception."""
        error = IdoineError("Test")
        assert isinstance(error, Exception)


class TestBuildError:
    """Tests for the BuildError exception."""

    def test_basic_message(self):
        """Test BuildError with basic message."""
        error = BuildError("Build failed")
        assert "Build failed" in str(error)

    def test_with_file_path(self):
        """Test BuildError with file path."""
        error = BuildError("Build failed", file_path=Path("/path/to/file.md"))
        assert "Build failed" in str(error)
        assert "file.md" in str(error)
        assert error.file_path == Path("/path/to/file.md")

    def test_with_details(self):
        """Test BuildError with details."""
        error = BuildError("Build failed", details="Missing template")
        assert "Build failed" in str(error)
        assert "Missing template" in str(error)

    def test_inherits_from_idoine_error(self):
        """Test that BuildError inherits from IdoineError."""
        error = BuildError("Test")
        assert isinstance(error, IdoineError)


class TestConfigError:
    """Tests for the ConfigError exception."""

    def test_basic_message(self):
        """Test ConfigError with basic message."""
        error = ConfigError("Invalid configuration")
        assert "Invalid configuration" in str(error)

    def test_with_config_file(self):
        """Test ConfigError with config file."""
        error = ConfigError("Invalid value", config_file="site_config.yaml")
        assert "Invalid value" in str(error)
        assert "site_config.yaml" in str(error)
        assert error.config_file == "site_config.yaml"

    def test_with_key(self):
        """Test ConfigError with config key."""
        error = ConfigError("Missing value", key="blog_url")
        assert "Missing value" in str(error)
        assert "blog_url" in str(error)
        assert error.key == "blog_url"

    def test_with_all_attributes(self):
        """Test ConfigError with all attributes."""
        error = ConfigError(
            "Invalid value",
            config_file="site_config.yaml",
            key="languages",
            details="Expected a list",
        )
        assert "Invalid value" in str(error)
        assert "site_config.yaml" in str(error)
        assert "languages" in str(error)
        assert "Expected a list" in str(error)

    def test_inherits_from_idoine_error(self):
        """Test that ConfigError inherits from IdoineError."""
        error = ConfigError("Test")
        assert isinstance(error, IdoineError)


class TestTemplateError:
    """Tests for the TemplateError exception."""

    def test_basic_message(self):
        """Test TemplateError with basic message."""
        error = TemplateError("Template rendering failed")
        assert "Template rendering failed" in str(error)

    def test_with_template_name(self):
        """Test TemplateError with template name."""
        error = TemplateError("Syntax error", template_name="base.html")
        assert "Syntax error" in str(error)
        assert "base.html" in str(error)
        assert error.template_name == "base.html"

    def test_with_line_number(self):
        """Test TemplateError with line number."""
        error = TemplateError(
            "Undefined variable",
            template_name="page.html",
            line_number=42,
        )
        assert "Undefined variable" in str(error)
        assert "42" in str(error)
        assert error.line_number == 42

    def test_inherits_from_idoine_error(self):
        """Test that TemplateError inherits from IdoineError."""
        error = TemplateError("Test")
        assert isinstance(error, IdoineError)


class TestContentError:
    """Tests for the ContentError exception."""

    def test_basic_message(self):
        """Test ContentError with basic message."""
        error = ContentError("Invalid content")
        assert "Invalid content" in str(error)

    def test_with_content_file(self):
        """Test ContentError with content file."""
        error = ContentError(
            "Invalid frontmatter",
            content_file=Path("/path/to/post.md"),
        )
        assert "Invalid frontmatter" in str(error)
        assert "post.md" in str(error)
        assert error.content_file == Path("/path/to/post.md")

    def test_with_field(self):
        """Test ContentError with field name."""
        error = ContentError(
            "Invalid value",
            content_file=Path("post.md"),
            field="date",
        )
        assert "Invalid value" in str(error)
        assert "date" in str(error)
        assert error.field == "date"

    def test_inherits_from_idoine_error(self):
        """Test that ContentError inherits from IdoineError."""
        error = ContentError("Test")
        assert isinstance(error, IdoineError)


class TestPathError:
    """Tests for the PathError exception."""

    def test_basic_message(self):
        """Test PathError with basic message."""
        error = PathError("Path not found")
        assert "Path not found" in str(error)

    def test_with_path(self):
        """Test PathError with path."""
        error = PathError("File not found", path=Path("/missing/file.txt"))
        assert "File not found" in str(error)
        assert "file.txt" in str(error)
        assert error.path == Path("/missing/file.txt")

    def test_inherits_from_idoine_error(self):
        """Test that PathError inherits from IdoineError."""
        error = PathError("Test")
        assert isinstance(error, IdoineError)


class TestImageProcessingError:
    """Tests for the ImageProcessingError exception."""

    def test_basic_message(self):
        """Test ImageProcessingError with basic message."""
        error = ImageProcessingError("Image processing failed")
        assert "Image processing failed" in str(error)

    def test_with_image_path(self):
        """Test ImageProcessingError with image path."""
        error = ImageProcessingError(
            "Cannot resize image",
            image_path=Path("/images/photo.jpg"),
        )
        assert "Cannot resize image" in str(error)
        assert "photo.jpg" in str(error)
        assert error.image_path == Path("/images/photo.jpg")

    def test_inherits_from_idoine_error(self):
        """Test that ImageProcessingError inherits from IdoineError."""
        error = ImageProcessingError("Test")
        assert isinstance(error, IdoineError)


class TestHandleBuildError:
    """Tests for the handle_build_error function."""

    def test_handle_idoine_error_with_reraise(self):
        """Test handling IdoineError with reraise=True."""
        error = IdoineError("Test error")

        # handle_build_error uses bare 'raise' which requires an exception context
        # So we need to call it from within an except block
        try:
            raise error
        except IdoineError:
            with pytest.raises(IdoineError):
                handle_build_error(error, reraise=True)

    def test_handle_idoine_error_without_reraise(self):
        """Test handling IdoineError with reraise=False."""
        error = IdoineError("Test error")

        # Should not raise
        handle_build_error(error, reraise=False)

    def test_handle_generic_exception_with_reraise(self):
        """Test handling generic exception with reraise=True."""
        error = ValueError("Generic error")

        with pytest.raises(BuildError):
            handle_build_error(error, reraise=True)

    def test_handle_generic_exception_without_reraise(self):
        """Test handling generic exception with reraise=False."""
        error = ValueError("Generic error")

        # Should not raise
        handle_build_error(error, reraise=False)

    def test_handle_error_with_context(self):
        """Test handling error with context."""
        error = ValueError("Something failed")

        with pytest.raises(BuildError) as exc_info:
            handle_build_error(error, context="Processing file.md", reraise=True)

        assert "Processing file.md" in str(exc_info.value)

    def test_logs_error(self):
        """Test that errors are logged (no exception raised with reraise=False)."""
        error = ValueError("Test error")

        # Just verify it doesn't raise when reraise=False
        # The function logs internally but we just verify it completes
        handle_build_error(error, reraise=False)


class TestExceptionHierarchy:
    """Tests for the exception class hierarchy."""

    def test_all_exceptions_inherit_from_idoine_error(self):
        """Test that all custom exceptions inherit from IdoineError."""
        exceptions = [
            BuildError("test"),
            ConfigError("test"),
            TemplateError("test"),
            ContentError("test"),
            PathError("test"),
            ImageProcessingError("test"),
        ]

        for exc in exceptions:
            assert isinstance(exc, IdoineError)
            assert isinstance(exc, Exception)

    def test_can_catch_all_with_idoine_error(self):
        """Test that all exceptions can be caught with IdoineError."""

        def raise_build_error():
            raise BuildError("Build failed")

        def raise_config_error():
            raise ConfigError("Config invalid")

        # All should be catchable with IdoineError
        for func in [raise_build_error, raise_config_error]:
            try:
                func()
            except IdoineError as e:
                assert isinstance(e, IdoineError)
