# Design — Sous-projet B : refactor du formulaire d'inscription (dédup + consolidation submit)

- **Date** : 2026-06-01
- **Dépôt** : Atelier St-Elme (JS front IIFE, pas de framework)
- **Branche** : `chantier/inscription-form-refactor` (depuis `atelierstelme`)
- **Statut** : design approuvé, en attente de revue du spec avant le plan
- **Chantier** : ③ « Cours & inscription », sous-projet **B** (après A déjà fusionné)

## 1. Contexte (vérifié dans le code)

Le formulaire d'inscription existe sur **deux pages**, avec les **mêmes IDs de champs**
(`#cours`, `#cours-libelle` [name=cours], `#course_id`, `#participants_json`) :

- **`/inscription/`** (`templates/pages/inscription.html`) charge, dans l'ordre :
  `coursLibelle.js` → `inscriptionParticipants.js` → `formPrefill.js`.
- **page course-detail** (`templates/pages/course-detail-form.html`) charge :
  `coursLibelle.js` → `inscriptionParticipants.js` → `courseDetailSessions.js` → `courseDetailForm.js`.

Constats :

1. **`syncCoursHiddenFields` est défini 3 fois, à l'identique** — dans `inscriptionParticipants.js`
   (l.105-120), `formPrefill.js` (l.182-197) et `courseDetailForm.js` (l.114-129). Tous lisent
   `#cours`/`#cours-libelle`/`#course_id` et utilisent `window.normalizeCoursLibelle`.
2. **`coursLibelle.js`** (chargé **en premier** sur les deux pages) expose déjà `window.normalizeCoursLibelle`
   et est le helper « champs cours » naturel.
3. **`inscriptionParticipants.js` est le propriétaire commun du submit** (chargé sur les deux pages) :
   son `onSubmit` fait `preventDefault` → validation → `participants_json` → submit natif
   (`HTMLFormElement.prototype.submit`).
4. **`formPrefill.attachSubmitGuard` et `courseDetailForm.attachSubmitGuard` sont du code mort** :
   chacun fait `if (ev.defaultPrevented) return;` ; comme `inscriptionParticipants` (chargé avant)
   appelle toujours `preventDefault`, ces gardes **bail systématiquement**. Conséquence : leur
   `syncCoursHiddenFields` est redondant et leur feedback bouton « Envoi en cours… » **ne s'affiche jamais**.

## 2. Objectif

Une seule définition de `syncCoursHiddenFields`, un seul propriétaire du submit (avec un vrai
feedback bouton), suppression du code mort, et réduction de la dépendance à l'ordre de chargement.

## 3. Périmètre

### Inclus
- Centraliser `syncCoursHiddenFields` dans `coursLibelle.js` (`window.syncCoursHiddenFields`).
- Faire pointer les 3 consommateurs vers la version partagée.
- Supprimer les deux `attachSubmitGuard` morts (`formPrefill.js`, `courseDetailForm.js`).
- Déplacer le feedback bouton (désactiver + « Envoi en cours… ») dans `inscriptionParticipants.onSubmit`.

### Exclus
- Polish UX plus large (messages de validation par champ, états d'erreur, a11y avancée du
  multi-participants) = sous-projet **C**/futur.
- La logique métier d'inscription (capacité, courriel) — traitée en **A** (déjà fait) / **D**.
- Le `getPlacesForSelection` (garde-fou client de capacité) reste inchangé.

## 4. Spécification détaillée

### 4.1 `src/scripts/coursLibelle.js`
Ajouter, dans l'IIFE (qui expose déjà `normalizeCoursLibelle`), la fonction partagée et son export :
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
  libelle.value = normalizeCoursLibelle(opt.textContent); // même module → appel direct
}
global.syncCoursHiddenFields = syncCoursHiddenFields;
```
Mettre à jour le commentaire d'en-tête pour refléter le double rôle (libellé + champs cachés cours).

### 4.2 `src/scripts/inscriptionParticipants.js`
- **Supprimer** la définition locale `function syncCoursHiddenFields() { … }` (l.105-120).
- Dans `onSubmit`, remplacer l'appel local `syncCoursHiddenFields();` (l.213) par `window.syncCoursHiddenFields();`.
- **Ajouter le feedback bouton** dans `onSubmit`, après que toutes les validations passent et
  juste avant `window.HTMLFormElement.prototype.submit.call(form)` (l.250) :
  ```js
  var submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';
  }
  ```
  (Placé après `pj.value = JSON.stringify(participants);`, avant le submit natif, pour ne désactiver
  qu'une fois la soumission garantie.)

### 4.3 `src/scripts/formPrefill.js`
- **Supprimer** la définition locale `syncCoursHiddenFields` (l.182-197).
- **Supprimer** `function attachSubmitGuard()` (l.257-269) **et ses 2 appels** (l.274 dans la
  branche `DOMContentLoaded`, l.278 dans la branche `else`).
- Dans `init`, utiliser la version partagée : `window.syncCoursHiddenFields();` (l.248) et
  `selectElement.addEventListener('change', window.syncCoursHiddenFields);` (l.249).

### 4.4 `src/scripts/courseDetailForm.js`
- **Supprimer** la définition locale `syncCoursHiddenFields` (l.114-129).
- **Supprimer** `function attachSubmitGuard()` (l.186-198) **et ses 2 appels** (l.203 dans la
  branche `DOMContentLoaded`, l.207 dans la branche `else`).
- Dans `init`, utiliser la version partagée : `window.syncCoursHiddenFields();` (l.177) et
  `selectElement.addEventListener('change', window.syncCoursHiddenFields);` (l.178).

> Note ordre de chargement : `coursLibelle.js` reste chargé **en premier** sur les deux templates
> (il définit `window.syncCoursHiddenFields` avant tous les consommateurs). `inscriptionParticipants.js`
> reste le propriétaire du submit. Aucune modification de template n'est nécessaire (les `<script>`
> sont déjà dans le bon ordre).

## 5. Vérification

- `node --check` sur les 4 fichiers JS → exit 0.
- `grep -rn "function syncCoursHiddenFields" src/scripts` → **1 seul** résultat (`coursLibelle.js`).
- `grep -rn "attachSubmitGuard" src/scripts` → **0** résultat.
- `grep -rn "window.syncCoursHiddenFields" src/scripts` → 3 consommateurs (inscriptionParticipants, formPrefill, courseDetailForm) + la définition.
- Revue du flux submit sur les deux pages : `inscriptionParticipants.onSubmit` est l'unique handler
  effectif ; il synchronise les champs cachés via la version partagée, désactive le bouton, puis
  soumet nativement.
- **`pytest` = 246** (aucun impact Python).
- **Smoke local recommandé** (`npm run dev`, port 9000) : `/inscription/` et une page course-detail —
  sélectionner un cours, ajouter une personne, envoyer ; vérifier que `cours`/`course_id`/`participants_json`
  sont remplis et que le bouton passe à « Envoi en cours… ».

## 6. Risques & rollback

| Risque | Prob. | Mitigation |
|---|---|---|
| `window.syncCoursHiddenFields` indéfini si ordre de script cassé | Faible | `coursLibelle.js` déjà premier sur les 2 templates ; appels défensifs possibles |
| Suppression d'un `attachSubmitGuard` qui n'était pas tout à fait mort | Faible | Vérifié : `inscriptionParticipants` preventDefault toujours en premier → garde bail ; revue du flux |
| Bouton désactivé trop tôt (avant validation) bloque l'utilisateur | Faible | Feedback placé APRÈS toutes les validations, juste avant le submit natif |
| Régression sur la page course-detail | Moyenne | Smoke local sur les deux pages ; commits atomiques réversibles |

## 7. Critères de succès

- [ ] Une seule définition de `syncCoursHiddenFields` (dans `coursLibelle.js`) ; les 3 consommateurs
      l'utilisent via `window.syncCoursHiddenFields`.
- [ ] Les deux `attachSubmitGuard` morts sont supprimés ; un seul handler de submit effectif
      (`inscriptionParticipants.onSubmit`).
- [ ] Le feedback bouton « Envoi en cours… » fonctionne désormais sur les deux pages.
- [ ] `node --check` OK ×4 ; `pytest` 246 ; aucun changement de template requis.
- [ ] Comportement de soumission inchangé (mêmes champs envoyés à Netlify Forms).
