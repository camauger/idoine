# Fiabilité de l'inscription (anti-surbooking) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la vérification de capacité d'inscription atomique (impossible de dépasser `places_max` même sous concurrence) dans le chemin actif, et supprimer l'endpoint `POST /api/inscriptions` dormant.

**Architecture:** Le chemin d'écriture actif est `netlify/functions/submission-created.js` (déclenché par le Netlify Form). On remplace son `COUNT → test → INSERT` non atomique par une transaction `sql.transaction([advisory_lock, insertion_gardée])` (driver `neon()` HTTP, sans nouvelle dépendance). On supprime le handler `POST /api/inscriptions` dormant d'`api.mjs`.

**Tech Stack:** Netlify Functions (Node, ESM + CJS), `@neondatabase/serverless` (driver HTTP `neon()`), Postgres (Neon). Pas de tests JS → vérification par revue SQL + `node --check` + `pytest` (Python inchangé).

**Branche:** `chantier/inscription-fiabilite` (depuis `atelierstelme`). Spec : `docs/superpowers/specs/2026-06-01-inscription-fiabilite-design.md`.

---

## Note de vérification

Pas de harnais de test JS ; la concurrence ne se teste pas sans BD réelle. Vérification par :
`node --check` (syntaxe), `git grep` (symboles supprimés), revue de la sémantique SQL (verrou
advisory + insertion gardée), et `pytest` = 246 (aucun impact Python). Chaque commit utilise le
trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. **Committer uniquement
les fichiers cités** (`git add <fichier>` explicite, jamais `git add -A`).

---

## Task 1 : Insertion atomique dans `submission-created.js` (A1)

**Files:**
- Modify: `netlify/functions/submission-created.js`

Contexte : après `normalizeParticipants`, le fichier fait (a) un pré-contrôle de capacité non
atomique, (b) un dup-check 15 min, (c) l'insertion. On **supprime (a)**, on **garde (b)**, on
**remplace (c)** par une transaction verrou + insertion gardée.

- [ ] **Step 1 : Supprimer le pré-contrôle de capacité non atomique**

Trouver et SUPPRIMER ce bloc (il précède le dup-check) :
```js
    const courseMeta = await sql`SELECT places_max FROM courses WHERE id = ${courseId} LIMIT 1`;
    const placesMax = (courseMeta[0] && courseMeta[0].places_max) || 0;
    const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM inscriptions WHERE course_id = ${courseId}`;
    const count = (countRows[0] && countRows[0].cnt) || 0;
    if (count + participants.length > placesMax) {
      console.error("Course full: need", participants.length, "only", placesMax - count, "left");
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, reason: "course_full" }),
      };
    }
```
(La vérification de capacité est désormais portée par l'insertion gardée du Step 2. Le dup-check
15 min qui suit ce bloc est CONSERVÉ tel quel.)

- [ ] **Step 2 : Remplacer le bloc d'insertion par la transaction atomique**

Trouver ce bloc (l'insertion actuelle, après le dup-check) :
```js
    const insertQueries = participants.map((p, index) => {
      const msg = index === 0 ? message : null;
      return sql`
        INSERT INTO inscriptions (course_id, nom, courriel, telephone, enfant, message, newsletter, est_membre, created_at)
        VALUES (${courseId}, ${p.nom}, ${courriel}, ${telephone}, ${p.enfant}, ${msg}, ${newsletter}, ${estMembre}, NOW())
        RETURNING id
      `;
    });

    let results;
    if (typeof sql.transaction === "function") {
      results = await sql.transaction(insertQueries, { isolationLevel: "ReadCommitted" });
    } else {
      results = [];
      for (const q of insertQueries) {
        results.push(await q);
      }
    }

    const ids = results.map((r) => r[0].id);
    console.log("Inscriptions created:", ids);
```
Le REMPLACER par :
```js
    const noms = participants.map((p) => p.nom);
    const enfants = participants.map((p) => p.enfant); // null possible
    const n = participants.length;

    // Verrou applicatif par cours : sérialise les inscriptions concurrentes du même cours.
    const lockQuery = sql`SELECT pg_advisory_xact_lock(${courseId})`;
    // Insertion tout-ou-rien : n'insère QUE si la capacité reste respectée (anti-surbooking).
    const insertQuery = sql`
      INSERT INTO inscriptions (course_id, nom, courriel, telephone, enfant, message, newsletter, est_membre, created_at)
      SELECT ${courseId}, t.nom, ${courriel}, ${telephone}, t.enfant,
             CASE WHEN t.ord = 1 THEN ${message} ELSE NULL END,
             ${newsletter}, ${estMembre}, NOW()
      FROM UNNEST(${noms}::text[], ${enfants}::text[]) WITH ORDINALITY AS t(nom, enfant, ord)
      WHERE (SELECT COUNT(*) FROM inscriptions WHERE course_id = ${courseId}) + ${n}
            <= (SELECT places_max FROM courses WHERE id = ${courseId})
      RETURNING id
    `;

    const txResults = await sql.transaction([lockQuery, insertQuery]);
    const insertedRows = txResults[1] || [];
    if (insertedRows.length === 0) {
      console.error("Course full (atomic guard):", courseId);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, reason: "course_full" }),
      };
    }
    const ids = insertedRows.map((r) => r.id);
    console.log("Inscriptions created (atomic):", ids);
```
(Les variables `courriel`, `telephone`, `message`, `newsletter`, `estMembre`, `courseId`,
`participants` existent déjà plus haut dans le handler. Le courriel de confirmation et la réponse
`success` qui SUIVENT ce bloc sont CONSERVÉS tels quels — ils utilisent `ids`.)

- [ ] **Step 3 : Vérifier la syntaxe**

Run : `node --check netlify/functions/submission-created.js`
Expected : exit 0, aucune erreur.

- [ ] **Step 4 : Vérifier que la capacité atomique et le flux nominal sont cohérents (revue)**

Relire le handler : (a) le pré-contrôle non atomique a disparu ; (b) le dup-check 15 min est
toujours là, avant la transaction ; (c) la transaction est `sql.transaction([lockQuery, insertQuery])` ;
(d) `insertedRows.length === 0` → `reason: "course_full"` ; (e) `ids` alimente toujours le courriel
de confirmation et la réponse `success`.

- [ ] **Step 5 : Commit**

```bash
git add netlify/functions/submission-created.js
git commit -m "fix(inscription): capacite atomique anti-surbooking (advisory lock + insertion gardee)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : Supprimer `POST /api/inscriptions` dormant (A3)

**Files:**
- Modify: `netlify/functions/api.mjs`

> Confirmé : le front n'appelle jamais `POST /api/inscriptions` (chemin actif = Netlify Form →
> `submission-created.js`). Le handler est une surface d'écriture/courriel non authentifiée inutile +
> une duplication. On le supprime, avec les symboles devenus inutilisés.

- [ ] **Step 1 : Supprimer l'import devenu inutilisé**

Trouver et SUPPRIMER (en haut du fichier) :
```js
import {
  sendInscriptionConfirmation,
  buildCourseLabel,
} from "./lib/sendInscriptionConfirmation.mjs";
```
(Ces symboles ne sont utilisés QUE par le handler supprimé au Step 3. `import crypto from "node:crypto";`
juste en dessous est CONSERVÉ — utilisé par `randomSlugSuffix` de l'admin.)

- [ ] **Step 2 : Supprimer la constante devenue inutilisée**

Trouver et SUPPRIMER :
```js
const MAX_INSCRIPTION_PARTICIPANTS = 8;
```
(Utilisée uniquement par le handler supprimé au Step 3.)

- [ ] **Step 3 : Supprimer le handler `POST /api/inscriptions`**

Lire `netlify/functions/api.mjs` autour des lignes 120-265 pour repérer les bornes exactes, puis
SUPPRIMER tout le bloc qui commence par :
```js
    // POST /api/inscriptions
    if (method === "POST" && pathname === "/api/inscriptions") {
```
…jusqu'à l'accolade fermante `}` de ce `if` (≈ 130 lignes), qui se trouve **juste avant** le handler
suivant `// POST /api/admin/login`. Ne PAS toucher au handler `/api/admin/login` ni aux autres
routes (`GET /api/cours`, `GET /api/cours/:slug`, admin). Après suppression, le `try {` doit
enchaîner les routes restantes proprement.

- [ ] **Step 4 : Mettre à jour le commentaire d'en-tête**

Dans le bloc de commentaire en tête de fichier, retirer la mention `POST /api/inscriptions` de la
liste des routes (ligne ≈ 5 : `*   GET /api/cours, GET /api/cours/:slug, POST /api/inscriptions`).
La remplacer par : `*   GET /api/cours, GET /api/cours/:slug`.

- [ ] **Step 5 : Vérifier**

Run : `node --check netlify/functions/api.mjs`
Expected : exit 0, aucune erreur de syntaxe.

Run : `git grep -nE "MAX_INSCRIPTION_PARTICIPANTS|sendInscriptionConfirmation|buildCourseLabel" -- netlify/functions/api.mjs`
Expected : aucun résultat (symboles retirés).

Run : `git grep -nE "pathname === \"/api/inscriptions\"" -- netlify/functions/api.mjs`
Expected : aucun résultat (handler supprimé).

Run : `git grep -nE "randomSlugSuffix|node:crypto" -- netlify/functions/api.mjs`
Expected : toujours présents (admin intact).

- [ ] **Step 6 : Commit**

```bash
git add netlify/functions/api.mjs
git commit -m "chore(inscription): supprime POST /api/inscriptions dormant (chemin actif = Netlify Form)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : Validation finale

**Files:** aucun (vérification globale).

- [ ] **Step 1 : Syntaxe des deux fonctions**

Run : `node --check netlify/functions/submission-created.js && node --check netlify/functions/api.mjs`
Expected : exit 0.

- [ ] **Step 2 : Le front n'a jamais référencé l'endpoint supprimé**

Run : `git grep -n "/api/inscriptions" -- src/`
Expected : aucun résultat (confirme qu'aucun appelant front n'est cassé).

- [ ] **Step 3 : Tests Python inchangés**

Run : `python -m pytest -q`
Expected : 246 passed.

- [ ] **Step 4 : Revue de la garantie anti-surbooking**

Confirmer par lecture que dans `submission-created.js` : `sql.transaction([lockQuery, insertQuery])`
exécute le `pg_advisory_xact_lock(courseId)` AVANT l'insertion gardée, et que l'insertion
`WHERE count + n <= places_max` ne peut pas insérer au-delà de la capacité (0 ligne → `course_full`).

- [ ] **Step 5 : Récapitulatif des commits**

Run : `git log --oneline atelierstelme..HEAD`
Expected : le commit du spec + 2 commits de tâches.

---

## Self-review (couverture du spec)

- [x] §4.1 A1 — insertion atomique (advisory lock + insertion gardée, dup-check & courriel conservés) → Task 1
- [x] §4.2 A3 — suppression de `POST /api/inscriptions` + imports/const inutilisés → Task 2
- [x] §5 vérification (node --check, git grep, pytest, revue SQL) → Task 3

Couverture complète. Hors-périmètre (dup-check race, miroir FastAPI, UX formulaire, jour/horaire) non traité.
