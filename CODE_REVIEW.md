# Python Code Review – IDOINE Static Site Generator

## Executive Summary
- **Project type**: Python-driven static site generator (CLI scripts) with a Node/Grunt asset pipeline. Not a Django/Flask/FastAPI web app.
- **Python versions**: README indicates Python 3.9+. `requirements.txt` is pip-compiled with Python 3.11. Recommend standardizing support to 3.9–3.12 and testing across these versions.
- **Structure**: Functional but not a standard Python package layout. Logic lives under `scripts/` with subpackages (`builders`, `core`, `utils`). Two overlapping build entry points exist: `scripts/build.py` and `scripts/core/build.py`.
- **Critical security issues**:
  - Dev server path traversal risk in `scripts/core/server.py` due to missing normalization/bounds checks in `translate_path`.
  - Potential XSS risk from Markdown → HTML content if templates render it unsafely. Jinja2 autoescape is enabled, but content transformed to HTML should be sanitized.
- **Performance**: Generally fine for a static generator. Some duplicated work and repeated calls.
- **Testing**: Minimal (`tests/test_utils.py` only). Add unit tests for builders and an end-to-end build test. Add coverage.

---

## Project Understanding
- **Entry points**:
  - `scripts/build.py` – main CLI orchestrator currently referenced in the README.
  - `scripts/core/build.py` – modularized variant with package-style imports.
- **Virtual environment**: `venv/` is present. README documents setup.
- **Dependencies**: Managed via `requirements.in` + pip-compile → `requirements.txt` (pinned). Tooling includes `black`, `flake8`, `pytest`, `Jinja2`, `Markdown`, `PyYAML`, `Babel`, `Unidecode`.
- **CI/CD**: No CI config detected. `netlify.toml` handles deployment (build runs both Node and Python steps).

---

## Code Quality Assessment

### Style and Conventions
- Naming mostly follows PEP 8: `snake_case` for functions, `PascalCase` for classes, constants upper-cased (e.g., emoji icon constants).
- Docstrings are present in some helpers (e.g., `utils/utils.py`) but are not consistent project-wide. Recommend PEP 257-compliant docstrings throughout public functions/classes.
- Imports are sometimes adjusted via `sys.path` manipulation (e.g., `scripts/build.py`). Prefer package imports over modifying `sys.path`.

### Structure and Organization
- Two parallel builder scripts:
  - `scripts/build.py` uses local imports and `sys.path` hacks.
  - `scripts/core/build.py` uses package-style imports (`from builders...`, `from core...`).
- Consolidate to a single canonical entry point with package-style imports and remove ad hoc `sys.path` modifications.
- Consider adopting a standard layout:

  ```
  my_project/
  ├── src/idoine_builder/
  │   ├── __init__.py
  │   ├── builders/
  │   ├── core/
  │   └── utils/
  ├── tests/
  ├── pyproject.toml
  └── README.md
  ```

### Pythonic Practices
- Good: Use of list/dict operations, comprehensions, and context managers for file writes.
- Improve: Replace manual path hacks with proper packaging; prefer absolute package imports (`scripts.utils.utils`) or move to `src/` layout with a top-level package.

---

## Security Review (Python-specific)

### Critical: Path Traversal in Dev Server
File: `scripts/core/server.py`

```startLine:endLine:scripts/core/server.py
10:33
class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = unquote(path)
        path = path.lstrip('/')
        full_path = os.path.join(DIRECTORY, path)

        if os.path.exists(full_path):
            if os.path.isdir(full_path):
                return os.path.join(full_path, 'index.html')
            return full_path

        if not os.path.splitext(full_path)[1]:
            full_path_html = full_path + '.html'
            if os.path.exists(full_path_html):
                return full_path_html

        return full_path
```

- Issue: `path` is not normalized or bounded. A crafted path like `../../..` can escape `dist/`.
- Fix options:
  - Use `os.path.normpath` and verify the final path stays within `DIST`.
  - Or use `SimpleHTTPRequestHandler(directory=DIRECTORY)` on Python 3.7+ and avoid custom `translate_path`.
  - Bind the server to `127.0.0.1` (not all interfaces) for dev, and document that it is dev-only.

Example hardened approach:

```python
requested = os.path.normpath(os.path.join(DIRECTORY, path))
root = os.path.abspath(DIRECTORY)
if not os.path.commonpath([root, requested]) == root:
    return os.path.join(root, 'index.html')  # or 404
```

### High: Markdown/HTML Sanitization
- Markdown is converted to HTML (`markdown.markdown(...)`). Even with Jinja2 autoescape, rendered HTML in the `content` variable may be marked safe in templates.
- Mitigation: Sanitize the generated HTML with `bleach` before rendering. Define an allow-list of tags/attributes.
- Alternatively, ensure templates do not mark untrusted HTML as safe. If content is trusted (authoring only), document the trust boundary explicitly.

### Other Security Notes
- `yaml.safe_load` is used (good). Avoid `yaml.load` without a safe loader.
- No `eval/exec/pickle` usage observed. No `subprocess` calls with `shell=True`.

---

## Performance and Resource Management
- Static generation approach is efficient for this scale.
- Minor inefficiency/bug: duplicated category/keyword page builds in `scripts/build.py`.

```startLine:endLine:scripts/build.py
116:139
            self.page_builder.build_pages()
            logging.info(f"{ICON_BUILD} Génération des posts...")
            posts = self.post_builder.build_posts()
            logging.info(f"{ICON_GLOSSARY} Génération du glossaire...")
            self.glossary_builder.build_terms()
            logging.info(
                f"{ICON_CATEGORY} Regroupement des posts pour les catégories et mots-clés..."
            )
            categories = {}
            keywords = {}
            for post in posts:
                for category in post.get("categories", []):
                    categories.setdefault(category, []).append(post)
                for keyword in post.get("meta_keywords", []):
                    keywords.setdefault(keyword, []).append(post)

            self.page_builder.build_category_pages(categories)
            self.page_builder.build_keyword_pages(keywords)

            logging.info(f"{ICON_CATEGORY} Génération des pages pour les catégories...")
            self.page_builder.build_category_pages(categories)
            logging.info(f"{ICON_CATEGORY} Génération des pages pour les mots-clés...")
            self.page_builder.build_keyword_pages(keywords)
```

- Action: Remove the first or second pair of calls; generate each taxonomy once.

---

## Framework-Specific Notes
- Not a Django/Flask/FastAPI app. Jinja2 is used purely for static rendering. Security notes above still apply for template rendering and content sanitization.

---

## Testing and QA
- Current: `tests/test_utils.py` covers `slugify` and `format_date_filter`.
- Add:
  - Unit tests for `PageBuilder`, `PostBuilder`, `GlossaryBuilder` using temporary directories and sample content.
  - End-to-end test: run the build on a small fixture tree, then assert presence of expected `dist/` files and key HTML contents.
  - Property-based tests for `slugify` (e.g., `hypothesis` to fuzz unicode inputs).
  - Coverage via `coverage.py` and enforce thresholds.

Suggested commands:

```bash
pytest -q
coverage run -m pytest && coverage html && coverage report --fail-under=80
```

---

## Tooling and Packaging

### Dependency and Tooling Management
- Good: `requirements.in` + `pip-compile` → `requirements.txt` with pinning.
- Improve:
  - Split dev and runtime dependencies: `requirements.in` + `requirements-dev.in`.
  - Add `isort`, `bandit`, `pip-audit`, `coverage`, optionally `mypy`.
  - Add `.pre-commit-config.yaml` to run `black`, `isort`, `flake8`, and basic security checks on commit.

### Configuration
Adopt a `pyproject.toml` to centralize tool config:

```toml
[tool.black]
line-length = 100

[tool.isort]
profile = "black"

[tool.flake8]
max-line-length = 100
extend-ignore = ["E203", "W503"]

[tool.pytest.ini_options]
addopts = "-q"

[tool.mypy]
python_version = "3.9"
strict = false
warn_unused_ignores = true

[project]
requires-python = ">=3.9"
```

### CI/CD
Add GitHub Actions for lint + tests across versions:

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.9", "3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: python -m pip install --upgrade pip
      - run: pip install pip-tools
      - run: pip install -r requirements.txt
      - run: pip install isort bandit pip-audit coverage
      - run: black --check scripts tests
      - run: isort --check-only scripts tests
      - run: flake8 scripts tests
      - run: coverage run -m pytest
      - run: coverage report --fail-under=80
      - run: bandit -r scripts
      - run: pip-audit
```

---

## Type Hints and Documentation
- Type hints are sporadic. Recommend annotating public functions and method signatures. Consider `dataclasses` for config-like structures.
- Ensure consistent docstrings (Google or NumPy style) across modules.
- Add API docs generation if this evolves into a distributable package; otherwise keep README up-to-date with build/run instructions (already solid).

---

## Dependency and Supply Chain
- Pins are present. Add periodic `pip-audit` and `safety` scans in CI.
- Review licenses if distributing. Current stack is commonly MIT-compatible.

---

## Python Version Compatibility
- Code uses mainstream 3.x constructs compatible with 3.9+.
- Standardize `requires-python >=3.9` (and test up to 3.12). Ensure `requirements.txt` remains resolvable on the full range.

---

## Actionable Recommendations (Prioritized)

### Critical
1. Harden `scripts/core/server.py` against path traversal; bind to `127.0.0.1`.
2. Sanitize Markdown-rendered HTML with `bleach`, or document/ensure trust boundary and avoid marking HTML as safe in templates.

### High
3. Consolidate to one build entry point. Prefer `scripts/core/build.py` with package imports. Remove `sys.path` hacks.
4. Remove duplicated taxonomy build calls in `scripts/build.py`.
5. Convert `scripts/` into a proper package, or adopt a `src/` layout with a top-level package name (e.g., `idoine_builder`). Add `scripts/__init__.py` if staying with the current layout.

### Medium
6. Introduce `pyproject.toml` with config for `black`, `isort`, `flake8`, `pytest`, and `mypy` (optional).
7. Add GitHub Actions CI running lint, security scans, and tests on 3.9–3.12.
8. Expand tests: unit tests for builders + end-to-end build test; add coverage gate.
9. Unify frontmatter parsing (prefer `python-frontmatter` everywhere or your own parser consistently).

### Low
10. Normalize logging (avoid emoji-only markers in logs where environments may not support UTF-8; keep readable fallbacks).
11. Add comprehensive docstrings for public functions and classes.

---

## Useful Commands

```bash
# Format and imports
black scripts tests
isort scripts tests

# Lint
flake8 scripts tests

# Tests and coverage
pytest -q
coverage run -m pytest && coverage report --fail-under=80

# Security
bandit -r scripts
pip-audit
```

---

## Notes on Templates and XSS
- Review your Jinja2 templates under `src/templates/` for places where `content` or other HTML fragments are rendered. Avoid `|safe` on untrusted HTML. If authoring is trusted, document this.
- If untrusted input is possible, sanitize Markdown output with `bleach` allow-lists before passing to templates.

---

## Closing
The codebase is clean and pragmatic for a static generator. Address the few critical items (dev server path traversal and HTML sanitization), consolidate the build entry points, and layer in CI/lint/tests for long-term maintainability. With a light packaging pass and consistent tooling, this will be straightforward to maintain and extend.
