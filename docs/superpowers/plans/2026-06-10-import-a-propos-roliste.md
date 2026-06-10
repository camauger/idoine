# Import du « À propos » rôliste — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le contenu portfolio de la page « À propos » (FR + EN) par le récit rôliste de `ludomancien2024`, repères temporels actualisés à 2026, et supprimer le SCSS portfolio orphelin.

**Architecture:** Site statique Idoine — contenu Markdown + front matter YAML dans `src/locales/{fr,en}/pages/`, rendu par le template Jinja2 `src/templates/pages/about.html` (hero + `{{ content | safe }}`). SCSS compilé par Grunt vers `dist/styles/main.css`. Aucun changement de template : le nouveau contenu est du Markdown pur rendu tel quel.

**Tech Stack:** Idoine (Python 3.10+), Jinja2, Markdown + YAML, Grunt + SCSS, `just` comme task runner (Windows PowerShell).

**Spec :** `docs/superpowers/specs/2026-06-10-import-a-propos-roliste-design.md`

**Référence source :** `C:\dev\ludomancien2024\src\pages\a-propos.vue` (lecture seule — on n'écrit jamais dans ludomancien2024).

---

## Décisions verrouillées (du spec)

- **Remplacement complet** du contenu portfolio — pas de fusion.
- **Deux seuls ajustements temporels** (l'utilisateur a décliné la révision stylistique ; les
  coquilles du texte source — « la bleu », « Emprunt de nostalgie » — sont **conservées
  volontairement**, ne pas les corriger) :
  1. « Cela fait 30 ans » → « Cela fait près de 40 ans »
  2. « je vis au Québec depuis 20 ans » → « je vis au Québec depuis 25 ans »
- `_about-page.scss` est supprimé **en entier** : vérification faite, sa règle `.container`
  est un doublon de `src/styles/layout/_layout.scss:20` (qui sert déjà `glossary.html`) et sa
  règle `body` est redondante avec `base/_reset.scss`, `base/_typography.scss` et
  `layout/_layout.scss`.
- Front matter EN : retirer `hero_cta` et `about_image` (liés au portfolio) ; conserver
  `title`, `description` (réécrite), `template`, `translation_id`.

---

### Task 1: Réécrire `about.md` FR avec le récit rôliste

**Files:**
- Modify: `src/locales/fr/pages/about.md` (remplacement intégral)

- [ ] **Step 1: Remplacer intégralement le contenu du fichier**

Écrire exactement ce contenu dans `src/locales/fr/pages/about.md` (outil Write, remplacement complet) :

```markdown
---
title: À propos
slug: a-propos
description: Près de 40 ans de jeu de rôle, de Tunnels & Trolls à la création de jeux — le parcours rôliste de Christian Amauger.
template: pages/about.html
translation_id: about
---

Cela fait près de 40 ans que je navigue dans l'univers du jeu de rôle. J'ai eu la chance d'être initié par mon grand frère, à la fin des années 80, lorsque le jeu de rôle a connu un essor en France.

J'ai commencé non pas avec Donjons & Dragons mais avec Tunnels & Trolls. L'avantage de cet ancien parmi les anciens était les scénarios en mode « solo », une passerelle parfaite entre les livres dont vous êtes le héros et le jeu de rôle proprement dit.

Ensuite, bien sûr, j'ai plongé dans Donjons & Dragons. La boîte rouge, pour commencer. Puis la bleu, la turquoise, la verte, etc.

J'ai initié mes amis, et nous avons exploré bien des univers de jeux, profitant de l'expansion et de la diversification du jeu pendant les années 90. Les classiques (D&D, T&T, Oeil Noir) ont laissé place à des systèmes plus complexes (Rolemaster), des univers plus originaux (Rêve de Dragon), des structures narratives plus intéressantes (Vampire La Mascarade). Les explorations de donjon furent abandonnées au profit de récits plus axés sur l'investigation et l'interprétation.

Comme beaucoup de ma génération, j'ai délaissé le jeu de rôle par manque de temps, par la difficulté à garder un groupe de jeu régulier. L'arrivée de Magic et des jeux vidéo a également éclipsé l'intérêt du jeu de rôle. Puis vint la famille, et la conciliation travail-famille-jeux est une équation difficile à gérer. J'ai toujours gardé un oeil sur l'évolution de mon passe-temps favori, lisant articles de blogs, magazines et mêmes livres de règles et campagnes, comme d'autres dévorent un bon polar.

Depuis quelques années, je suis redevenu un rôliste actif, après avoir longtemps été en dormance. Ce retour au jeu était important pour moi. Emprunt de nostalgie d'abord, et la nostalgie est un sentiment précieux pour celui qui s'est expatrié (je vis au Québec depuis 25 ans). Mais ce qui était au départ pour moi un retour sur le passé est devenu beaucoup plus significatif. Le jeu de rôle est fondamentalement important. Encore plus aujourd'hui qu'hier. Dans une société dans laquelle la culture s'atomise, l'appartenance à une sous-culture est précieuse. Oui, il y a une culture ludique.

Le jeu de rôle est également plus important que jamais car il nous fait réfléchir sur notre rapport au temps, aux autres, à nous-mêmes.
```

Notes de fidélité : le texte est la transcription exacte de `a-propos.vue` (graphies
« oeil »/« Oeil », « mêmes livres », « la bleu », « Emprunt de nostalgie » conservées),
aux deux ajustements temporels près (« près de 40 ans », « depuis 25 ans »).

- [ ] **Step 2: Builder le site en mode dev**

Run : `python scripts/build.py --dev`
Expected : build sans erreur (code retour 0).

- [ ] **Step 3: Vérifier le HTML généré**

Run (PowerShell) :
```powershell
$page = Get-ChildItem dist -Recurse -Filter "*.html" | Select-String -Pattern "Tunnels & Trolls|Tunnels &amp; Trolls" -List | Select-Object -ExpandProperty Path
$page
Select-String -Path $page -Pattern "passion-card" -Quiet
```
Expected : au moins un chemin de page FR (a-propos) affiché ; le second test renvoie `False`
(plus aucune classe portfolio dans la page FR).

- [ ] **Step 4: Commit**

```powershell
git add src/locales/fr/pages/about.md
git commit -m @'
feat(about): remplace le portfolio par le récit rôliste (FR)

Import depuis ludomancien2024/src/pages/a-propos.vue, converti en
Markdown pur. Repères temporels actualisés : « près de 40 ans »,
« au Québec depuis 25 ans ».

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: Réécrire `about.md` EN (traduction du récit)

**Files:**
- Modify: `src/locales/en/pages/about.md` (remplacement intégral)

- [ ] **Step 1: Remplacer intégralement le contenu du fichier**

Écrire exactement ce contenu dans `src/locales/en/pages/about.md` :

```markdown
---
title: About
description: Nearly forty years of roleplaying games — from Tunnels & Trolls to game design, Christian Amauger's journey as a roleplayer.
template: pages/about.html
translation_id: about
---

I have been navigating the world of tabletop roleplaying games for nearly forty years. I was lucky enough to be introduced to the hobby by my older brother in the late 1980s, when roleplaying games were booming in France.

I did not start with Dungeons & Dragons but with Tunnels & Trolls. The advantage of that elder among elders was its "solo" scenarios, a perfect bridge between choose-your-own-adventure books and roleplaying games proper.

Then, of course, I dove into Dungeons & Dragons. The red box, to start. Then the blue one, the turquoise, the green, and so on.

I introduced my friends to the hobby, and together we explored many game worlds, riding the wave of expansion and diversification of the 1990s. The classics (D&D, T&T, The Dark Eye) gave way to more complex systems (Rolemaster), more original settings (Rêve de Dragon), and more interesting narrative structures (Vampire: The Masquerade). Dungeon crawls were abandoned in favor of stories built on investigation and roleplay.

Like many of my generation, I drifted away from roleplaying games for lack of time and the difficulty of keeping a regular gaming group together. The arrival of Magic and video games also eclipsed the appeal of roleplaying. Then came family, and balancing work, family and games is a difficult equation to manage. I always kept an eye on my favorite pastime, reading blog posts, magazines, and even rulebooks and campaigns the way others devour a good detective novel.

A few years ago, I became an active roleplayer again, after a long dormancy. This return to the game mattered to me. Tinged with nostalgia at first — and nostalgia is a precious feeling for someone who has left his home country (I have been living in Quebec for 25 years). But what began as a look back at the past became much more meaningful. Roleplaying games are fundamentally important. Even more so today than yesterday. In a society where culture is fragmenting, belonging to a subculture is precious. Yes, there is such a thing as gaming culture.

Roleplaying games also matter more than ever, because they make us reflect on our relationship to time, to others, and to ourselves.
```

Notes : `hero_cta` et `about_image` sont retirés du front matter (portfolio). Le fichier EN
d'origine n'a pas de clé `slug` — ne pas en ajouter. « Oeil Noir » est traduit par son nom
anglais officiel « The Dark Eye ».

- [ ] **Step 2: Builder le site en mode dev**

Run : `python scripts/build.py --dev`
Expected : build sans erreur.

- [ ] **Step 3: Vérifier le HTML généré EN**

Run (PowerShell) :
```powershell
$page = Get-ChildItem dist -Recurse -Filter "*.html" | Select-String -Pattern "The Dark Eye" -List | Select-Object -ExpandProperty Path
$page
Select-String -Path $page -Pattern "passion-card|expertise-card" -Quiet
```
Expected : le chemin de la page EN about affiché ; le second test renvoie `False`.

- [ ] **Step 4: Commit**

```powershell
git add src/locales/en/pages/about.md
git commit -m @'
feat(about): translate the roleplayer story for the EN about page

Faithful translation of the FR récit rôliste; drops portfolio-era
hero_cta and about_image front matter keys.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 3: Supprimer le SCSS portfolio orphelin

**Files:**
- Delete: `src/styles/pages/_about-page.scss`
- Modify: `src/styles/pages/index.scss:3`

- [ ] **Step 1: Vérifier qu'aucun usage des classes portfolio ne subsiste**

Run (PowerShell) :
```powershell
Get-ChildItem src -Recurse -Include *.md,*.html,*.js | Select-String -Pattern "passion-card|expertise-card|impact-card|intro-title|passions-grid" | Select-Object Path, LineNumber
```
Expected : aucun résultat (les deux `about.md` ont été réécrits en Tasks 1-2).
Si un résultat apparaît : STOP, signaler — ne pas supprimer le fichier.

- [ ] **Step 2: Supprimer le fichier SCSS**

```powershell
git rm src/styles/pages/_about-page.scss
```

- [ ] **Step 3: Retirer l'import dans `index.scss`**

Dans `src/styles/pages/index.scss`, supprimer la ligne 3 :

```scss
@use "about-page";
```

Le fichier devient :

```scss
@use "home";
@use "about";
@use "hero";
@use "glossary-term";
@use "glossary-tag";
```

- [ ] **Step 4: Compiler le CSS et vérifier**

Run :
```powershell
npx grunt build
Select-String -Path dist/styles/main.css -Pattern "passion-card" -Quiet
Select-String -Path dist/styles/main.css -Pattern "\.container" -Quiet
```
Expected : compilation sans erreur ; premier test `False` (styles portfolio absents) ;
second test `True` (`.container` de `layout/_layout.scss` toujours présent pour le
glossaire).

- [ ] **Step 5: Commit**

```powershell
git add src/styles/pages/index.scss
git commit -m @'
refactor(styles): supprime _about-page.scss devenu orphelin

Les classes portfolio (.passion-card, .expertise-*, .impact-*, .intro-*)
ne sont plus référencées depuis la réécriture des pages about. Les
règles génériques body et .container de ce fichier étaient des doublons
de base/ et layout/_layout.scss (qui continue de servir glossary.html).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 4: Vérification finale (build complet + contrôle visuel)

**Files:** aucun (vérification seulement)

- [ ] **Step 1: Build de production complet**

Run : `just build`
(équivaut à `npx grunt build` puis `python scripts/build.py`)
Expected : aucun échec.

- [ ] **Step 2: Lancer la prévisualisation**

Run : `just preview` (en arrière-plan) — sert `dist/` sur http://localhost:8000
Expected : serveur démarré.

- [ ] **Step 3: Contrôle des trois pages**

Vérifier (curl ou navigateur) :
1. Page « À propos » FR (`/a-propos/` ou chemin trouvé en Task 1 Step 3) : hero affiché,
   récit rôliste en paragraphes, « près de 40 ans » et « depuis 25 ans » présents, aucune
   carte portfolio.
2. Page « About » EN : traduction affichée, « The Dark Eye » présent.
3. Page glossaire : mise en page intacte (le conteneur `.container` est stylé — largeur
   contrainte et centrée, pas de texte pleine largeur collé aux bords).

```powershell
curl.exe -s http://localhost:8000/a-propos/ | Select-String "près de 40 ans"
curl.exe -s http://localhost:8000/a-propos/ | Select-String "passion-card"
```
Expected : première commande renvoie une ligne ; deuxième ne renvoie rien.
(Adapter les URL aux chemins réels constatés dans `dist/`.)

- [ ] **Step 4: Arrêter la prévisualisation et clore**

Arrêter le serveur. Cocher les critères d'acceptation dans
`docs/superpowers/specs/2026-06-10-import-a-propos-roliste-design.html`.
Aucun commit attendu à cette task (sauf correctifs découverts — les committer
individuellement avec un message `fix(about): …`).

---

## Hors périmètre (rappel)

Ne PAS toucher : brouillon `outils-images.md`, page « Liens », pages « Verglas »,
CLAUDE.md. Ces suivis sont notés dans le spec.
