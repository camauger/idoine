# Spec — Import du « À propos » rôliste depuis ludomancien2024

**Date :** 2026-06-10
**Statut :** validé (design approuvé en brainstorming)
**Branche de travail :** à créer depuis `css-improvements` ou `main`

## Contexte

Le chantier initial visait à « importer les articles et pages de `C:\dev\ludomancien2024` »
(ancien site Vue/Vite) dans ce repo (générateur Idoine). L'exploration a montré que
l'essentiel est déjà importé :

- **33 articles** : corps de texte strictement identiques entre les deux repos ; seul le
  front matter a été normalisé côté Idoine (clés triées, ajout de `title`/`summary`).
- **Images** : les ~145 images d'articles (banners, thumbnails) sont déjà dans
  `src/assets/images`.

Restaient quatre contenus non importés ; après arbitrage, **un seul est retenu** :

| Contenu source | Décision |
|---|---|
| `drafts/outils-images.md` (brouillon) | Hors périmètre |
| `src/pages/liens.vue` (annuaire JDR) | Hors périmètre |
| `src/pages/verglas/*.vue` (jeu Verglas) | Hors périmètre |
| `src/pages/a-propos.vue` (récit rôliste) | **À importer — ce spec** |

## Objectif

Remplacer le contenu actuel de la page « À propos » (portfolio professionnel) par le
récit rôliste personnel de `ludomancien2024`, en FR et en EN, et nettoyer le SCSS
portfolio devenu orphelin.

Décisions validées :

1. **Remplacement complet** — le contenu portfolio est retiré (pas de fusion).
2. **Repères temporels actualisés à 2026** — chaque ajustement est soumis dans le diff.
3. **Approche B** — réécriture Markdown pur + nettoyage SCSS orphelin.
4. **Version EN traduite** — traduction fidèle du récit, mêmes repères actualisés.

## Conception

### 1. Contenu FR — `src/locales/fr/pages/about.md`

- Le corps actuel (HTML portfolio : `.intro`, `.passion-card`, `.expertise-grid`, etc.)
  est remplacé par le récit rôliste de `a-propos.vue`, converti en **Markdown pur** :
  paragraphes simples, aucun balisage HTML.
- Front matter conservé : `title`, `slug: a-propos`, `template: pages/about.html`,
  `translation_id: about`.
- `description` (SEO) réécrite pour refléter le récit rôliste.
- Actualisation des repères temporels (texte écrit vers 2021) :
  - « Cela fait 30 ans que je navigue… » → ajusté (initiation fin des années 80, donc
    « près de 40 ans » ou équivalent) ;
  - « je vis au Québec depuis 20 ans » → « depuis 25 ans » ;
  - tout autre repère daté détecté à la conversion est listé dans le diff.
- La voix et le contenu du texte sont préservés ; pas de réécriture stylistique.

### 2. Contenu EN — `src/locales/en/pages/about.md`

- Traduction fidèle du même récit (voix personnelle préservée, repères actualisés
  identiques).
- Même structure de front matter que la page FR (avec `translation_id: about`).

### 3. Nettoyage SCSS — `src/styles/pages/_about-page.scss`

Constats vérifiés :

- Les classes portfolio (`.intro`, `.intro-title`, `.intro-text`, `.section-title`,
  `.passions*`, `.expertise*`, `.impact*`, `.games`, `.contact*`, `.passion-card`,
  `.card-title`) ne sont utilisées **que** par les deux `about.md` → supprimables après
  réécriture.
- `.container` est aussi utilisé par `src/templates/pages/glossary.html` → la règle est
  **déplacée** vers un emplacement partagé (layout/base) ou conservée ; elle ne doit pas
  disparaître.
- La règle globale `body { … }` du fichier est probablement redondante avec les styles
  de base → vérifier la duplication avant suppression ; en cas de doute, la conserver.
- Le `@use "about-page"` dans `src/styles/pages/index.scss` est retiré ou ajusté selon
  ce qui reste du fichier.

### 4. Vérification

- Build local : `python scripts/build.py` sans erreur.
- Contrôle visuel : pages `/a-propos` (FR), `/en/about` (EN) et glossaire (pour
  `.container`).
- Aucun autre template ni page ne doit changer.

## Critères d'acceptation

- [ ] `src/locales/fr/pages/about.md` contient le récit rôliste en Markdown pur, sans HTML.
- [ ] Les repères temporels sont actualisés et chaque ajustement a été soumis à validation.
- [ ] `description` du front matter FR reflète le nouveau contenu.
- [ ] `src/locales/en/pages/about.md` contient la traduction fidèle du récit.
- [ ] Les styles portfolio orphelins sont supprimés de `_about-page.scss`.
- [ ] `.container` fonctionne toujours sur la page glossaire.
- [ ] Le build passe et les trois pages (about FR, about EN, glossaire) s'affichent correctement.

## Hors périmètre (suivis futurs)

- Import du brouillon `outils-images.md` (mentionné dans CLAUDE.md mais absent du repo).
- Page « Liens » (annuaire d'une vingtaine de blogs/podcasts JDR, `liens.vue` +
  `websites.json`).
- Pages « Verglas » (présentation du jeu, mise en page riche, template dédié à créer).
- Mise à jour du CLAUDE.md (décompte « 1 brouillon » inexact).
