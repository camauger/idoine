# Refactor du formulaire d'inscription (dédup + consolidation submit) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une seule définition de `syncCoursHiddenFields` (dans `coursLibelle.js`), un seul propriétaire du submit (`inscriptionParticipants.onSubmit`, avec feedback bouton), et suppression des 2 `attachSubmitGuard` morts.

**Architecture:** JS front en IIFE, sans framework, chargé par `<script>` dans les templates. `coursLibelle.js` est chargé en premier sur les deux pages portant le formulaire (`/inscription/` et course-detail) ; il devient le helper partagé exposant `window.syncCoursHiddenFields`. `inscriptionParticipants.js` (chargé sur les deux pages) reste l'unique propriétaire du submit.

**Tech Stack:** JavaScript navigateur (ES5/IIFE), templates Jinja2. Pas de tests JS → vérification par `node --check` + `grep` + revue + `pytest` (Python inchangé).

**Branche:** `chantier/inscription-form-refactor` (depuis `atelierstelme`). Spec : `docs/superpowers/specs/2026-06-01-inscription-form-refactor-design.md`.

---

## Note de vérification
Pas de harnais de test JS. Vérification : `node --check` (×4), `grep` (1 seule définition, 0 garde),
revue du flux submit, `pytest` 246. Chaque commit utilise le trailer
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. **Committer uniquement
les fichiers cités** (`git add <fichier>` explicite).

---

## Task 1 : Centraliser `syncCoursHiddenFields` dans `coursLibelle.js` + brancher les 3 consommateurs

**Files:**
- Modify: `src/scripts/coursLibelle.js`
- Modify: `src/scripts/inscriptionParticipants.js`
- Modify: `src/scripts/formPrefill.js`
- Modify: `src/scripts/courseDetailForm.js`

- [ ] **Step 1 : Ajouter la fonction partagée dans `coursLibelle.js`**

Le fichier est une IIFE `(function (global) { 'use strict'; function normalizeCoursLibelle(text){…} global.normalizeCoursLibelle = normalizeCoursLibelle; })(...)`.
Juste avant `global.normalizeCoursLibelle = normalizeCoursLibelle;`, insérer la fonction partagée et, après la ligne d'export existante, ajouter son export :
```js
  function syncCoursHiddenFields() {
    var sel = document.getElementById('cours');
    var libelle = document.getElementById('cours-libelle');
    var idField = document.getElementById('course_id');
    if (!sel || !libelle || !idField) return;
    var opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      libelle.value = '';
      idField.value = '';
      return;
    }
    idField.value = opt.value;
    libelle.value = normalizeCoursLibelle(opt.textContent);
  }

  global.normalizeCoursLibelle = normalizeCoursLibelle;
  global.syncCoursHiddenFields = syncCoursHiddenFields;
```
(Remplacer la ligne d'export unique existante `global.normalizeCoursLibelle = normalizeCoursLibelle;` par le bloc ci-dessus, en insérant la fonction au-dessus.) Mettre à jour le commentaire d'en-tête pour mentionner les deux helpers (libellé + champs cachés cours).

- [ ] **Step 2 : `inscriptionParticipants.js` — utiliser la version partagée**

Supprimer la définition locale (≈ l.105-120) :
```js
  function syncCoursHiddenFields() {
    var sel = getSelect();
    var libelle = document.getElementById('cours-libelle');
    var idField = document.getElementById('course_id');
    if (!sel || !libelle || !idField) return;
    var opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      libelle.value = '';
      idField.value = '';
      return;
    }
    idField.value = opt.value;
    libelle.value = window.normalizeCoursLibelle
      ? window.normalizeCoursLibelle(opt.textContent)
      : (opt.textContent || '').trim();
  }
```
Dans `onSubmit`, remplacer l'appel `syncCoursHiddenFields();` (≈ l.213) par :
```js
    if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
```
(`getSelect()` reste utilisé par `getPlacesForSelection` — ne pas le supprimer.)

- [ ] **Step 3 : `formPrefill.js` — utiliser la version partagée**

Supprimer la définition locale `function syncCoursHiddenFields() { … }` (≈ l.182-197).
Dans `init`, remplacer (≈ l.248-249) :
```js
        syncCoursHiddenFields();
        selectElement.addEventListener('change', syncCoursHiddenFields);
```
par :
```js
        if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
        selectElement.addEventListener('change', function () {
          if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
        });
```

- [ ] **Step 4 : `courseDetailForm.js` — utiliser la version partagée**

Supprimer la définition locale `function syncCoursHiddenFields() { … }` (≈ l.114-129).
Dans `init`, remplacer (≈ l.177-178) :
```js
        syncCoursHiddenFields();
        selectElement.addEventListener('change', syncCoursHiddenFields);
```
par :
```js
        if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
        selectElement.addEventListener('change', function () {
          if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
        });
```

- [ ] **Step 5 : Vérifier**

Run : `node --check src/scripts/coursLibelle.js && node --check src/scripts/inscriptionParticipants.js && node --check src/scripts/formPrefill.js && node --check src/scripts/courseDetailForm.js`
Expected : exit 0.

Run : `grep -rn "function syncCoursHiddenFields" src/scripts`
Expected : **1 seul** résultat (`src/scripts/coursLibelle.js`).

Run : `grep -rcn "window.syncCoursHiddenFields" src/scripts`
Expected : présent dans coursLibelle.js (export) + inscriptionParticipants.js + formPrefill.js + courseDetailForm.js.

> Note : `attachSubmitGuard` est encore présent (référence `syncCoursHiddenFields`) — il est traité à la Task 2.

- [ ] **Step 6 : Commit**

```bash
git add src/scripts/coursLibelle.js src/scripts/inscriptionParticipants.js src/scripts/formPrefill.js src/scripts/courseDetailForm.js
git commit -m "refactor(inscription): centralise syncCoursHiddenFields dans coursLibelle.js (3 copies -> 1)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : Supprimer les `attachSubmitGuard` morts + déplacer le feedback bouton

**Files:**
- Modify: `src/scripts/formPrefill.js`
- Modify: `src/scripts/courseDetailForm.js`
- Modify: `src/scripts/inscriptionParticipants.js`

> `attachSubmitGuard` (formPrefill.js + courseDetailForm.js) est mort : `if (ev.defaultPrevented) return;`
> bail toujours, car `inscriptionParticipants.onSubmit` (chargé avant) `preventDefault`. On le supprime
> et on déplace son feedback bouton dans l'unique propriétaire du submit.

- [ ] **Step 1 : `formPrefill.js` — supprimer `attachSubmitGuard` + ses 2 appels**

Supprimer la fonction (≈ l.257-269) :
```js
  function attachSubmitGuard() {
    var form = document.getElementById('inscription-form');
    if (!form) return;
    form.addEventListener('submit', function (ev) {
      if (ev.defaultPrevented) return;
      syncCoursHiddenFields();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Envoi en cours…';
      }
    });
  }
```
Et supprimer ses **2 appels** dans le bloc DOM-ready (≈ l.274 branche `DOMContentLoaded`, ≈ l.278 branche `else`) : retirer les lignes `attachSubmitGuard();`. Conserver les appels `init();`.

- [ ] **Step 2 : `courseDetailForm.js` — supprimer `attachSubmitGuard` + ses 2 appels**

Supprimer la fonction (≈ l.186-198) :
```js
  function attachSubmitGuard() {
    var form = document.getElementById('inscription-form');
    if (!form) return;
    form.addEventListener('submit', function (ev) {
      if (ev.defaultPrevented) return;
      syncCoursHiddenFields();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Envoi en cours…';
      }
    });
  }
```
Et supprimer ses **2 appels** dans le bloc DOM-ready (≈ l.203, ≈ l.207) : retirer les lignes `attachSubmitGuard();`. Conserver les appels `init();`.

- [ ] **Step 3 : `inscriptionParticipants.js` — ajouter le feedback bouton dans `onSubmit`**

Dans `onSubmit`, trouver la fin (≈ l.249-250) :
```js
    pj.value = JSON.stringify(participants);
    window.HTMLFormElement.prototype.submit.call(form);
```
Remplacer par :
```js
    pj.value = JSON.stringify(participants);
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';
    }
    window.HTMLFormElement.prototype.submit.call(form);
```
(Le feedback n'est appliqué qu'après toutes les validations — donc juste avant le submit natif garanti.)

- [ ] **Step 4 : Vérifier**

Run : `node --check src/scripts/formPrefill.js && node --check src/scripts/courseDetailForm.js && node --check src/scripts/inscriptionParticipants.js`
Expected : exit 0.

Run : `grep -rn "attachSubmitGuard" src/scripts`
Expected : **0** résultat.

Run : `grep -rn "Envoi en cours" src/scripts`
Expected : **1 seul** résultat (`inscriptionParticipants.js`).

- [ ] **Step 5 : Commit**

```bash
git add src/scripts/formPrefill.js src/scripts/courseDetailForm.js src/scripts/inscriptionParticipants.js
git commit -m "refactor(inscription): supprime attachSubmitGuard mort + feedback bouton dans onSubmit" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : Validation finale

**Files:** aucun (vérification globale).

- [ ] **Step 1 : Syntaxe des 4 fichiers**

Run : `for f in coursLibelle inscriptionParticipants formPrefill courseDetailForm; do node --check "src/scripts/$f.js" && echo "$f OK"; done`
Expected : 4× OK.

- [ ] **Step 2 : Invariants**

Run : `grep -rn "function syncCoursHiddenFields" src/scripts` → 1 (coursLibelle.js).
Run : `grep -rn "attachSubmitGuard" src/scripts` → 0.
Run : `grep -rn "Envoi en cours" src/scripts` → 1 (inscriptionParticipants.js).

- [ ] **Step 3 : Tests Python inchangés**

Run : `python -m pytest -q`
Expected : 246 passed.

- [ ] **Step 4 : Revue du flux submit (2 pages)**

Confirmer par lecture : sur `/inscription/` (coursLibelle + inscriptionParticipants + formPrefill) et
sur la page course-detail (coursLibelle + inscriptionParticipants + courseDetailSessions + courseDetailForm),
`inscriptionParticipants.onSubmit` est l'unique handler de submit ; il appelle `window.syncCoursHiddenFields()`,
désactive le bouton (« Envoi en cours… »), puis soumet nativement. `formPrefill`/`courseDetailForm` ne font
plus que peupler le select + écouter `change`.

- [ ] **Step 5 : Smoke local (recommandé)**

Run : `npx grunt build` puis servir/ouvrir `/inscription/` et une page course-detail (ex. `npm run dev`).
Vérifier la sélection de cours, l'ajout d'une personne, et que le bouton passe à « Envoi en cours… ».
(Optionnel si pas d'environnement interactif ; sinon la revue de code fait foi.)

- [ ] **Step 6 : Récapitulatif**

Run : `git log --oneline atelierstelme..HEAD`
Expected : spec + plan + 2 commits de tâches.

---

## Self-review (couverture du spec)

- [x] §4.1 coursLibelle.js expose `window.syncCoursHiddenFields` → Task 1 Step 1
- [x] §4.2 inscriptionParticipants : version partagée + feedback bouton → Task 1 Step 2 + Task 2 Step 3
- [x] §4.3 formPrefill : version partagée + suppression attachSubmitGuard (2 appels) → Task 1 Step 3 + Task 2 Step 1
- [x] §4.4 courseDetailForm : version partagée + suppression attachSubmitGuard (2 appels) → Task 1 Step 4 + Task 2 Step 2
- [x] §5 vérification → Task 3

Couverture complète. Hors-périmètre (polish UX, validation par champ) non traité.
