# Design — Chantier « Réparation du système visuel »

- **Date** : 2026-05-31
- **Dépôt** : Atelier St-Elme (SCSS via Grunt, tokens CSS custom properties)
- **Branche** : `chantier/design-visuel` (créée depuis `atelierstelme`)
- **Statut** : design approuvé (approche ① hybride), en attente de revue du spec avant le plan
- **Chantier** : 2ᵉ des trois (après « Fondation », avant « Cours & inscription »)

## 1. Contexte

`src/styles/base/_variables.scss` implémente déjà la direction visuelle « Warm & Organic » du
`design-brief.md` (terracotta / clay cream / kiln charcoal + sage / amber / glass blue, polices
Fraunces + Source Serif Pro, échelle 1.25, ombres chaudes, espacements, et un thème sombre
tokenisé). **Le système de design existe et est conforme au brief.** Le problème n'est pas le
look mais son **application** : un audit a trouvé **28 « tokens fantômes »** — des `var()` utilisés
dans les composants/pages mais **jamais définis** (96 définis, 111 utilisés). Sans valeur de
repli, ces déclarations échouent en silence (coins droits par défaut, codage couleur par
discipline absent, textes mal teintés, étiquette « featured » sans fond).

Décisions prises en brainstorming :
- **Direction** : garder « Warm & Organic » (pas d'évolution).
- **Portée** : réparation **+ cohérence** (définir les tokens manquants, corriger les
  incohérences de nommage, retirer le SCSS mort). **Pas** de polish/refonte page par page.
- **Couleurs par discipline** : mapping **A** — Céramique = terracotta, Vitrail = glass blue,
  Mosaïque = amber (variantes `-light`/`-dark` dérivées).
- **Mode sombre** : laissé **désactivé** (hors périmètre).
- **Approche** : **① hybride** — concepts manquants définis au centre (`_variables.scss`) ;
  typos/doublons de nommage corrigés aux points d'appel (cohérence) ; code mort retiré.

## 2. Objectif

Que le système de design déjà conçu s'**applique réellement** : zéro token fantôme, noms
cohérents, partials morts retirés — sans changer la direction visuelle ni refondre les pages.

## 3. Périmètre

### Inclus
1. Définir les concepts manquants dans `_variables.scss` (couleurs par discipline, échelle de
   gris chaude, `--border-radius-md`, tokens sémantiques/dérivés).
2. Corriger les typos de nommage aux points d'appel (`--color-stone-gray`, `--radius-*`).
3. Retirer le SCSS mort/dupliqué (`_image-detail.scss` ; consolider `_about*`).
4. Vérifier : 0 token fantôme, build OK, revue visuelle, `pytest` inchangé.

### Exclus (autres chantiers)
- Polish / refonte visuelle des pages (hiérarchie, cartes de cours, hero…).
- Mode sombre (réactivation).
- Toute la dette non visuelle (backends, inscription, SEO, CORS, docs).

## 4. Spécification détaillée

### 4.1 Tokens à AJOUTER dans `src/styles/base/_variables.scss` (bloc `:root`)

**Couleurs par discipline** (nouvelle sous-section après « Secondary Colors ») :
```scss
// Discipline Colors (codage couleur des cours)
--color-ceramique: #C2714F;          // = terracotta
--color-ceramique-light: #F1DDD2;    // fond de section pâle
--color-ceramique-dark: #A85D3F;     // hover / texte
--color-vitrail: #4A7C8C;            // = glass blue
--color-vitrail-light: #D9E6EA;
--color-vitrail-dark: #3A6271;
--color-mosaique: #D4A853;           // = amber
--color-mosaique-light: #F4E8CC;
--color-mosaique-dark: #B08B3C;
```

**Échelle de gris chaude** (teintée chaud, cohérente avec la palette ; utilisée par l'admin) :
```scss
// Warm Gray Ramp (neutres tièdes, pas de gris froid)
--color-gray-50:  #F7F5F1;
--color-gray-100: #EFEBE4;
--color-gray-200: #E2DCD2;
--color-gray-300: #CFC7BA;
--color-gray-400: #B3A99B;
--color-gray-500: #9C9589;   // = stone
--color-gray-600: #7D766B;
--color-gray-700: #5C554C;
--color-gray-800: #3A342D;
```

**Comble le trou de l'échelle de rayon** (après `--border-radius`) :
```scss
--border-radius-md: 0.5rem;  // 8px — entre sm (4px) et lg (12px)
```

**Tokens sémantiques / dérivés** (avec les autres semantic colors) :
```scss
--color-text-muted: var(--color-stone);
--color-text-accent: var(--color-terracotta);
--color-accent: var(--color-primary);
--color-clay-light: var(--color-warm-white);
--color-primary-rgb: 194, 113, 79;   // pour rgba(var(--color-primary-rgb), …)
--gradient-primary: linear-gradient(135deg, var(--color-terracotta), var(--color-amber));
```

> Note dark mode : ces nouveaux tokens ne sont définis que dans `:root`. Le mode sombre étant
> hors périmètre/désactivé, on n'ajoute pas de variantes sombres. Si le dark mode est réactivé
> plus tard, prévoir les variantes des couleurs par discipline et de la rampe de gris.

> `--color-text-secondary` n'est **pas** ajouté : son unique consommateur (`_image-detail.scss`)
> est supprimé (§4.3).

### 4.2 Corrections aux points d'appel (cohérence — nom canonique unique)

| Token fantôme | Remplacer par | Fichiers (occurrences) |
|---|---|---|
| `--color-stone-gray` | `--color-stone` | `src/styles/pages/_emploi.scss` (l.53, 142, 159) ; `src/styles/pages/_calendrier.scss` (l.97, 114, 190, 203, 215, 301, 360, 411, 444) |
| `--radius-sm` | `--border-radius-sm` | `src/styles/pages/_admin.scss` (l.265, 398) |
| `--radius-md` | `--border-radius-md` | `src/styles/pages/_admin.scss` (l.476, 585) |
| `--radius-lg` | `--border-radius-lg` | `src/styles/pages/_admin.scss` (l.20, 68, 135, 425, 485) |
| `--radius-full` | `--border-radius-full` | `src/styles/pages/_admin.scss` (l.293, 318) |

Méthode : remplacement textuel par fichier (`replace_all` du nom de token). Vérifier ensuite
qu'aucune occurrence de l'ancien nom ne subsiste.

### 4.3 SCSS mort / dupliqué à retirer

- **`src/styles/components/_image-detail.scss`** : **non importé** dans
  `src/styles/components/index.scss` (qui n'inclut que card, buttons, gallery, forms,
  site-dialog) → mort. `git rm` le fichier. C'est le seul utilisateur de
  `--color-text-secondary`, qui disparaît donc.
  - Garde-fou : confirmer qu'aucun `@use`/`@forward`/`@import` ne le référence avant suppression.
- **`_about.scss` vs `_about-page.scss`** (les deux dans `pages/index.scss`) : duplication.
  Au moment du plan : lire `src/templates/pages/about.html` et les deux partials, déterminer
  lequel correspond aux classes réellement émises, **conserver celui-là**, supprimer l'autre et
  retirer son `@use` de `src/styles/pages/index.scss`. Si les deux contribuent des styles
  distincts utilisés, fusionner en un seul partial. Décision documentée dans le plan.

### 4.4 Vérification (pas de tests SCSS auto)

- **0 token fantôme** : recalculer l'ensemble « utilisés via `var()` » moins « définis dans
  `_variables.scss` » → doit être **vide** (modulo les `var(--x, fallback)` intentionnels).
- `npx grunt build` se termine sans erreur ; `dist/styles/main.min.css` régénéré.
- **Revue visuelle** (rendu local + compagnon avant/après) des pages touchées : **admin**
  (rayons, gris chauds, couleurs de discipline), **calendrier** & **emploi** (stone),
  **galerie** (accent, text-muted, primary-rgb), **cours** (clay-light, border-radius-md),
  **blog/post** (gradient-primary sur `.featured-label`).
- `pytest` = 246 (aucun impact Python attendu).

## 5. Risques & rollback

| Risque | Prob. | Mitigation |
|---|---|---|
| Mauvais partial about supprimé | Faible | Vérifier les classes vs le gabarit avant `git rm` ; historique git |
| Changement visuel inattendu sur une page | Moyenne | Revue visuelle avant/après page par page ; commits atomiques réversibles |
| Une occurrence de token oubliée | Faible | Grep de vérification « phantom = vide » en fin de chantier |
| Gris chauds jugés trop chauds à l'écran | Faible | Valeurs ajustables dans un seul fichier (`_variables.scss`) |

## 6. Critères de succès

- [ ] Le grep « tokens utilisés mais non définis » revient **vide**.
- [ ] Les tokens manquants sont définis dans `_variables.scss` (couleurs de discipline + bases,
      rampe de gris chaude, `--border-radius-md`, tokens sémantiques) ; les 5 noms-typos corrigés
      aux points d'appel ; `_image-detail.scss` supprimé ; un seul partial `about`.
- [ ] `npx grunt build` OK ; `pytest` 246.
- [ ] Revue visuelle : admin, calendrier, emploi, galerie, cours, blog s'affichent comme prévu
      (coins arrondis, couleurs par discipline, gris chauds, textes atténués, étiquette featured).
- [ ] Aucune régression de direction visuelle (palette/typo inchangées).
