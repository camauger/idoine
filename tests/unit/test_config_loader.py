"""
Unit tests for the config_loader module.
"""

from pathlib import Path

import pytest

from core.config_loader import ConfigLoader


class TestConfigLoader:
    """Tests for the ConfigLoader class."""

    def test_init_with_valid_path(self, temp_site_structure: dict):
        """Test initialization with a valid path."""
        loader = ConfigLoader(temp_site_structure["src"])
        assert loader.src_path == temp_site_structure["src"]

    def test_load_site_config(self, temp_site_structure: dict):
        """Test loading site configuration."""
        loader = ConfigLoader(temp_site_structure["src"])
        config = loader.load_site_config()

        assert isinstance(config, dict)
        assert "title" in config
        assert config["title"] == "Test Site"

    def test_load_translations(self, temp_site_structure: dict):
        """Test loading translations."""
        loader = ConfigLoader(temp_site_structure["src"])
        translations = loader.load_translations()

        assert isinstance(translations, dict)
        assert "fr" in translations
        assert "en" in translations

    def test_load_projects(self, temp_site_structure: dict):
        """Test loading projects data."""
        loader = ConfigLoader(temp_site_structure["src"])
        projects = loader.load_projects()

        assert isinstance(projects, dict)

    def test_config_contains_languages(self, temp_site_structure: dict):
        """Test that config contains language settings."""
        loader = ConfigLoader(temp_site_structure["src"])
        config = loader.load_site_config()

        assert "languages" in config
        assert isinstance(config["languages"], list)
        assert "fr" in config["languages"]
        assert "en" in config["languages"]

    def test_config_contains_blog_url(self, temp_site_structure: dict):
        """Test that config contains blog URL."""
        loader = ConfigLoader(temp_site_structure["src"])
        config = loader.load_site_config()

        assert "blog_url" in config


class TestConfigLoaderMissingFiles:
    """Tests for ConfigLoader with missing files."""

    def test_missing_config_file(self, tmp_path: Path):
        """Test handling of missing config file."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        loader = ConfigLoader(src_path)

        # Should return empty dict or raise exception depending on implementation
        try:
            config = loader.load_site_config()
            assert isinstance(config, dict)
        except FileNotFoundError:
            pass  # Expected behavior

    def test_missing_translations_file(self, tmp_path: Path):
        """Test handling of missing translations file."""
        src_path = tmp_path / "src"
        (src_path / "config").mkdir(parents=True)

        # Create minimal config file
        config_file = src_path / "config" / "site_config.yaml"
        config_file.write_text("title: Test")

        loader = ConfigLoader(src_path)

        # Should return empty dict or raise exception depending on implementation
        try:
            translations = loader.load_translations()
            assert isinstance(translations, dict)
        except FileNotFoundError:
            pass  # Expected behavior


class TestConfigLoaderValidation:
    """Tests for configuration validation."""

    def test_translations_have_required_keys(self, temp_site_structure: dict):
        """Test that translations contain expected keys."""
        loader = ConfigLoader(temp_site_structure["src"])
        translations = loader.load_translations()

        for lang in translations.values():
            assert "site_name" in lang

