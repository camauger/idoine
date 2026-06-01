# Réparation du système visuel — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire que le système de design « Warm & Organic » déjà tokenisé s'applique réellement — éliminer les 28 « tokens fantômes » (var() non définis), corriger les typos de nommage, retirer le SCSS mort — sans changer la direction visuelle.

**Architecture:** Tokens CSS custom properties dans `src/styles/base/_variables.scss` (source unique) ; partials SCSS par composant/page compilés par Grunt (`npx grunt build`). Approche hybride : concepts manquants définis au centre, typos corrigées aux points d'appel, partials morts supprimés.

**Tech Stack:** SCSS (Dart Sass), Grunt, custom properties CSS. Pas de tests SCSS auto → vérification par grep « phantom = vide » + `npx grunt build` + revue visuelle.

**Branche:** `chantier/design-visuel` (depuis `atelierstelme`). Spec : `docs/superpowers/specs/2026-05-31-design-visuel-reparation-design.md` (commit `684bf57`).

---

## Note de vérification

Le contrôle automatique central de ce chantier est le **grep des tokens fantômes** :
```bash
grep -oE "^[[:space:]]*--[a-z0-9-]+:" src/styles/base/_variables.scss | sed 's/[: ]//g' | sort -u > /tmp/defined.txt
grep -rhoE "var\(--[a-z0-9-]+" src/styles --include=*.scss | sed 's/var(//' | sort -u > /tmp/used.txt
comm -23 /tmp/used.txt /tmp/defined.txt
```
Avant le chantier : 28 lignes. Objectif en fin de chantier : **0 ligne**.
Chaque commit utilise le trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Structure des fichiers

| Fichier | Action |
|---|---|
| `src/styles/base/_variables.scss` | Ajouter 25 tokens (discipline ×9, gris chauds ×9, `--border-radius-md`, sémantiques ×6) |
| `src/styles/pages/_emploi.scss` | `--color-stone-gray` → `--color-stone` |
| `src/styles/pages/_calendrier.scss` | `--color-stone-gray` → `--color-stone` |
| `src/styles/pages/_admin.scss` | `--radius-*` → `--border-radius-*` |
| `src/styles/components/_image-detail.scss` | Supprimer (mort) |
| `src/styles/pages/_about.scss` | Supprimer (mort) |
| `src/styles/pages/index.scss` | Retirer `@use "about";` |

---

## Task 1 : Définir les tokens manquants dans `_variables.scss`

**Files:**
- Modify: `src/styles/base/_variables.scss`

- [ ] **Step 1 : Ajouter les couleurs par discipline (après les couleurs secondaires)**

Trouver :
```scss
  --color-glass-blue: #4A7C8C;          // Links, interactive elements
  --color-glass-blue-light: #5E94A6;     // Hover states

  // Neutral Tones
```
Remplacer par :
```scss
  --color-glass-blue: #4A7C8C;          // Links, interactive elements
  --color-glass-blue-light: #5E94A6;     // Hover states

  // Discipline Colors (codage couleur des cours)
  // ---------------------------------------------------------------------------
  --color-ceramique: #C2714F;            // = terracotta
  --color-ceramique-light: #F1DDD2;      // fond de section pâle
  --color-ceramique-dark: #A85D3F;       // hover / texte
  --color-vitrail: #4A7C8C;              // = glass blue
  --color-vitrail-light: #D9E6EA;
  --color-vitrail-dark: #3A6271;
  --color-mosaique: #D4A853;             // = amber
  --color-mosaique-light: #F4E8CC;
  --color-mosaique-dark: #B08B3C;

  // Neutral Tones
```

- [ ] **Step 2 : Ajouter la rampe de gris chaude (après les tons neutres)**

Trouver :
```scss
  --color-deep-brown: #4A3F35;           // Footer, dark sections
  --color-deep-brown-dark: #3A3129;      // Darker variant

  // Semantic Colors
```
Remplacer par :
```scss
  --color-deep-brown: #4A3F35;           // Footer, dark sections
  --color-deep-brown-dark: #3A3129;      // Darker variant

  // Warm Gray Ramp (neutres tièdes, pas de gris froid — utilisée par l'admin)
  // ---------------------------------------------------------------------------
  --color-gray-50: #F7F5F1;
  --color-gray-100: #EFEBE4;
  --color-gray-200: #E2DCD2;
  --color-gray-300: #CFC7BA;
  --color-gray-400: #B3A99B;
  --color-gray-500: #9C9589;             // = stone
  --color-gray-600: #7D766B;
  --color-gray-700: #5C554C;
  --color-gray-800: #3A342D;

  // Semantic Colors
```

- [ ] **Step 3 : Ajouter les tokens sémantiques / dérivés (dans le bloc Semantic Colors)**

Trouver :
```scss
  --color-border: var(--color-stone-light);
  --color-white: #ffffff;
```
Remplacer par :
```scss
  --color-border: var(--color-stone-light);
  --color-white: #ffffff;
  --color-accent: var(--color-primary);
  --color-text-muted: var(--color-stone);
  --color-text-accent: var(--color-terracotta);
  --color-clay-light: var(--color-warm-white);
  --color-primary-rgb: 194, 113, 79;     // pour rgba(var(--color-primary-rgb), …)
  --gradient-primary: linear-gradient(135deg, var(--color-terracotta), var(--color-amber));
```

- [ ] **Step 4 : Ajouter `--border-radius-md` (dans le bloc BORDERS & RADIUS)**

Trouver :
```scss
  --border-radius: 0.5rem;               // 8px - default
  --border-radius-lg: 0.75rem;           // 12px - larger elements
```
Remplacer par :
```scss
  --border-radius: 0.5rem;               // 8px - default
  --border-radius-md: 0.5rem;            // 8px - medium (= défaut, comble l'échelle)
  --border-radius-lg: 0.75rem;           // 12px - larger elements
```

- [ ] **Step 5 : Vérifier que le build passe et que les fantômes baissent**

Run : `npx grunt build`
Expected : succès, `dist/styles/main.min.css` régénéré.

Run (recompte des fantômes) :
```bash
grep -oE "^[[:space:]]*--[a-z0-9-]+:" src/styles/base/_variables.scss | sed 's/[: ]//g' | sort -u > /tmp/defined.txt
grep -rhoE "var\(--[a-z0-9-]+" src/styles --include=*.scss | sed 's/var(//' | sort -u > /tmp/used.txt
comm -23 /tmp/used.txt /tmp/defined.txt
```
Expected : il ne reste que `--color-stone-gray`, `--color-text-secondary`, et `--radius-full/-lg/-md/-sm` (6 lignes — traitées aux tâches 2, 3, 4).

- [ ] **Step 6 : Commit**

```bash
git add src/styles/base/_variables.scss
git commit -m "feat(design): definit les tokens manquants (discipline, gris chauds, radius-md, semantiques)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : Corriger `--color-stone-gray` → `--color-stone`

**Files:**
- Modify: `src/styles/pages/_emploi.scss`
- Modify: `src/styles/pages/_calendrier.scss`

- [ ] **Step 1 : Remplacer toutes les occurrences dans `_emploi.scss`**

Remplacer chaque `var(--color-stone-gray)` par `var(--color-stone)` dans `src/styles/pages/_emploi.scss` (occurrences attendues : l.53, 142, 159). Utiliser un remplacement global du texte `--color-stone-gray` → `--color-stone`.

- [ ] **Step 2 : Remplacer toutes les occurrences dans `_calendrier.scss`**

Idem dans `src/styles/pages/_calendrier.scss` (l.97, 114, 190, 203, 215, 301, 360, 411, 444).

- [ ] **Step 3 : Vérifier qu'il ne reste aucune occurrence**

Run : `grep -rn "color-stone-gray" src/styles`
Expected : aucun résultat.

Run : `npx grunt build`
Expected : succès.

- [ ] **Step 4 : Commit**

```bash
git add src/styles/pages/_emploi.scss src/styles/pages/_calendrier.scss
git commit -m "fix(design): --color-stone-gray -> --color-stone (typo, emploi + calendrier)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : Corriger `--radius-*` → `--border-radius-*` dans `_admin.scss`

**Files:**
- Modify: `src/styles/pages/_admin.scss`

> Dépend de Task 1 (`--border-radius-md` doit exister).

- [ ] **Step 1 : Remplacer les 4 noms de token (remplacements globaux, ordre important)**

Dans `src/styles/pages/_admin.scss`, effectuer ces remplacements globaux de texte :
1. `var(--radius-sm)` → `var(--border-radius-sm)` (l.265, 398)
2. `var(--radius-md)` → `var(--border-radius-md)` (l.476, 585)
3. `var(--radius-lg)` → `var(--border-radius-lg)` (l.20, 68, 135, 425, 485)
4. `var(--radius-full)` → `var(--border-radius-full)` (l.293, 318)

> Faire les remplacements sur le motif complet `var(--radius-XXX)` pour ne pas toucher d'autres chaînes.

- [ ] **Step 2 : Vérifier qu'il ne reste aucun `--radius-` (hors `--border-radius-`)**

Run : `grep -rnE "var\(--radius-" src/styles`
Expected : aucun résultat.

Run : `npx grunt build`
Expected : succès.

- [ ] **Step 3 : Commit**

```bash
git add src/styles/pages/_admin.scss
git commit -m "fix(design): --radius-* -> --border-radius-* (coherence echelle, admin)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 : Supprimer `_image-detail.scss` (mort)

**Files:**
- Delete: `src/styles/components/_image-detail.scss`

> Confirmé non importé : `src/styles/components/index.scss` n'inclut que card, buttons, gallery, forms, site-dialog. C'est le seul utilisateur de `--color-text-secondary`.

- [ ] **Step 1 : Confirmer qu'aucun `@use`/`@forward`/`@import` ne le référence**

Run : `grep -rnE "image-detail" src/styles`
Expected : aucun résultat (le fichier ne s'auto-référence pas et n'est importé nulle part).

- [ ] **Step 2 : Supprimer le fichier**

```bash
git rm src/styles/components/_image-detail.scss
```

- [ ] **Step 3 : Vérifier**

Run : `grep -rn "color-text-secondary" src/styles`
Expected : aucun résultat (le seul usage a disparu avec le fichier).

Run : `npx grunt build`
Expected : succès.

- [ ] **Step 4 : Commit**

```bash
git commit -m "chore(design): supprime _image-detail.scss mort (residu IDOINE, non importe)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 : Supprimer `_about.scss` (mort) + retirer son `@use`

**Files:**
- Delete: `src/styles/pages/_about.scss`
- Modify: `src/styles/pages/index.scss`

> Confirmé : `a-propos.md` utilise `.container/.intro/.intro-title/.intro-text/.section-title/.contact/.contact-content` = sélecteurs de `_about-page.scss` (LIVE). Les classes de `_about.scss` (`.about-grid/.about-content/.about-image/.about`) ne sont utilisées nulle part. On garde `_about-page.scss`, on supprime `_about.scss`.

- [ ] **Step 1 : Re-confirmer que les classes de `_about.scss` sont inutilisées**

Run : `grep -rnE "about-grid|about-content|about-image|class=\"about\"" src/locales src/templates`
Expected : aucun résultat. (Si un résultat apparaît, STOP : `_about.scss` est utilisé — réévaluer.)

- [ ] **Step 2 : Supprimer le fichier**

```bash
git rm src/styles/pages/_about.scss
```

- [ ] **Step 3 : Retirer la ligne `@use "about";` de `pages/index.scss`**

Dans `src/styles/pages/index.scss`, trouver :
```scss
@use "home";
@use "about";
@use "about-page";
```
Remplacer par :
```scss
@use "home";
@use "about-page";
```
(Garder `@use "about-page";` — c'est le partial vivant.)

- [ ] **Step 4 : Vérifier que le build passe (l'import retiré ne casse rien)**

Run : `npx grunt build`
Expected : succès ; `dist/styles/main.min.css` régénéré (Sass ne se plaint pas d'un `@use` manquant).

- [ ] **Step 5 : Commit**

```bash
git add src/styles/pages/_about.scss src/styles/pages/index.scss
git commit -m "chore(design): supprime _about.scss mort + son @use (about-page est le live)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 : Vérification finale du chantier

**Files:** aucun (vérification globale).

- [ ] **Step 1 : 0 token fantôme**

Run :
```bash
grep -oE "^[[:space:]]*--[a-z0-9-]+:" src/styles/base/_variables.scss | sed 's/[: ]//g' | sort -u > /tmp/defined.txt
grep -rhoE "var\(--[a-z0-9-]+" src/styles --include=*.scss | sed 's/var(//' | sort -u > /tmp/used.txt
comm -23 /tmp/used.txt /tmp/defined.txt
```
Expected : **aucune ligne** (tous les tokens utilisés sont définis).

- [ ] **Step 2 : Build complet**

Run : `npx grunt build`
Expected : succès ; `dist/styles/main.min.css` présent.

- [ ] **Step 3 : Tests Python inchangés**

Run : `python -m pytest -q`
Expected : 246 passed.

- [ ] **Step 4 : Revue visuelle (rendu local + compagnon avant/après)**

Vérifier visuellement les pages touchées : **admin** (coins arrondis, gris chauds, couleurs par discipline aux l.297-308), **calendrier** & **emploi** (texte/bordures en stone), **galerie** (accent, texte atténué, voile `rgba(--color-primary-rgb)`), **cours** (clay-light, border-radius-md), **blog/post** (`.featured-label` avec `--gradient-primary`). Aucune régression de palette/typo.

- [ ] **Step 5 : Récapitulatif des commits**

Run : `git log --oneline atelierstelme..HEAD`
Expected : le commit du spec + ~5 commits de tâches.

---

## Self-review (couverture du spec)

- [x] §4.1 tokens manquants définis → Task 1
- [x] §4.2 corrections de typos (stone-gray, radius-*) → Tasks 2, 3
- [x] §4.3 SCSS mort (_image-detail + _about) → Tasks 4, 5
- [x] §4.4 vérification (phantom vide, build, pytest, revue visuelle) → Task 6

Couverture complète. Hors-périmètre (polish pages, dark mode, dette non visuelle) non traité.
