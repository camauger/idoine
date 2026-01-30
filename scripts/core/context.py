from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict


@dataclass
class BuildContext:
    src_path: Path
    dist_path: Path
    site_config: Dict[str, Any]
    translations: Dict[str, Any]
    jinja_env: Any
    projects: Any
