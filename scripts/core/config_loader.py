"""
Configuration loader for the IDOINE static site generator.

Handles loading site configuration, translations, and project data from YAML files.
"""

from pathlib import Path
from typing import Any, Dict

import yaml


class ConfigLoader:
    """Loads configuration files for the site generator."""

    def __init__(self, src_path: Path):
        """
        Initialize the ConfigLoader.

        Args:
            src_path: Path to the source directory containing config files.
        """
        self.src_path = src_path

    def load_translations(self) -> Dict[str, Dict[str, str]]:
        """
        Load translation strings from YAML file.

        Returns:
            Dictionary mapping language codes to translation dictionaries.

        Raises:
            FileNotFoundError: If translations.yaml doesn't exist.
            yaml.YAMLError: If YAML parsing fails.
        """
        with open(
            self.src_path / "data" / "translations.yaml", "r", encoding="utf-8"
        ) as f:
            return yaml.safe_load(f)

    def load_projects(self) -> Dict[str, Any]:
        """
        Load project data from YAML file.

        Returns:
            Dictionary containing project configurations.

        Raises:
            FileNotFoundError: If projects.yaml doesn't exist.
            yaml.YAMLError: If YAML parsing fails.
        """
        with open(self.src_path / "data" / "projects.yaml", "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def load_site_config(self) -> Dict[str, Any]:
        """
        Load site configuration from YAML file.

        Returns:
            Dictionary containing site settings (title, languages, URLs, etc.).

        Raises:
            FileNotFoundError: If site_config.yaml doesn't exist.
            yaml.YAMLError: If YAML parsing fails.
        """
        with open(
            self.src_path / "config" / "site_config.yaml", "r", encoding="utf-8"
        ) as f:
            return yaml.safe_load(f)
