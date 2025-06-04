import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "scripts"))

from utils import slugify, format_date_filter


def test_slugify_basic():
    assert slugify("Projet Éléphant") == "projet-elephant"


def test_slugify_special_chars():
    assert slugify("mot-clé1") == "mot-cle1"


def test_format_date_filter_long_french():
    formatted = format_date_filter("2023-10-25")
    assert formatted == "25 octobre 2023"
