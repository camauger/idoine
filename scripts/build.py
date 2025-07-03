#!/usr/bin/env python3
"""
Script principal de build du générateur de site statique IDOINE.

Ce script sert de point d'entrée principal et importe les fonctionnalités
depuis la nouvelle organisation modulaire des packages.
"""

import argparse
import sys
from pathlib import Path

# Ajouter le dossier scripts au path pour les imports
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from core.build import SiteBuilder

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Site Builder CLI options")
    parser.add_argument("--build", action="store_true", help="Build the site")

    args = parser.parse_args()
    if args.build:
        builder = SiteBuilder()
        builder.build()
    else:
        parser.print_help()
