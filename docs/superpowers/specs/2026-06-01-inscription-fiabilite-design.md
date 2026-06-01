# Design — Sous-projet A : fiabilité de l'inscription (anti-surbooking)

- **Date** : 2026-06-01
- **Dépôt** : Atelier St-Elme (fonctions Netlify Node + Neon Postgres)
- **Branche** : `chantier/inscription-fiabilite` (depuis `atelierstelme`)
- **Statut** : design approuvé, en attente de revue du spec avant le plan
- **Chantier** : ③ « Cours & inscription », sous-projet **A** (le 1er des 5 sous-projets)

## 1. Contexte (vérifié dans le code)

Le formulaire d'inscription (`src/templates/pages/inscription.html`, `course-detail-form.html`)
est un **Netlify Form** (`data-netlify="true"`, `form-name=inscription`). `inscriptionParticipants.js`
intercepte le submit, valide, remplit `participants_json`, puis fait une **soumission native**
(`HTMLFormElement.prototype.submit`). Cela déclenche **`netlify/functions/submission-created.js`**,
qui écrit dans Neon. **C'est le seul chemin d'écriture actif** : aucun script du front n'appelle
`POST /api/inscriptions`.

Deux constats de l'audit initial se sont révélés **infondés** après lecture du code et ne sont
donc pas traités : (a) « double chemin d'écriture » — il n'y en a qu'un à l'exécution ; (b) « perte
de `jour_prefere`/`horaire_prefere` » — le formulaire ne collecte pas ces champs.

Le **vrai bug** (confirmé) : dans `submission-created.js`, la vérification de capacité est
**non atomique** —
```
COUNT(*) → si count + N > places_max alors refuser → sinon INSERT
```
Deux soumissions concurrentes pour les dernières places lisent le même `count`, passent toutes
deux le test, et insèrent → **surbooking** (deux personnes sur la dernière place). Le contrôle
côté client (`getPlacesForSelection`, attribut `data-places-restantes`) n'est qu'un garde-fou
*advisory* (potentiellement périmé).

Point connexe : **`POST /api/inscriptions` dans `api.mjs` est dormant** — non appelé par le front,
mais reachable (endpoint public non authentifié qui écrit en BD **et** envoie des courriels Resend,
avec la **même** course de capacité). Surface d'écriture/abus inutile + duplication de logique.

## 2. Objectif

Rendre la vérification de capacité **atomique** (impossible de dépasser `places_max`, même sous
concurrence) dans le chemin actif, et **supprimer** l'endpoint dormant.

## 3. Périmètre

### Inclus
- **A1** — `submission-created.js` : remplacer le `COUNT → test → INSERT` non atomique par une
  **transaction avec verrou applicatif (`pg_advisory_xact_lock`) + insertion gardée tout-ou-rien**.
- **A3** — `api.mjs` : **supprimer** le handler `POST /api/inscriptions` et les symboles devenus
  inutilisés.

### Exclus
- La course mineure du **dup-check** (fenêtre 15 min) : c'est de l'idempotence (double-clic), pas du
  surbooking — laissée telle quelle.
- Le **miroir FastAPI** (`backend/app/routers/public.py`) — dev-only, hors prod.
- L'**UX du formulaire** (multi-participants, triplication de `syncCoursHiddenFields`, ordre des
  scripts) — sous-projet **B**.
- `jour_prefere`/`horaire_prefere` — non collectés par le formulaire (faux problème).

## 4. Spécification détaillée

### 4.1 A1 — `netlify/functions/submission-created.js`

Contexte actuel : après résolution du `courseId` et `normalizeParticipants`, le code fait
(≈ l.163-173) une lecture `places_max` + `COUNT(*)` + test, puis (≈ l.175-199) le **dup-check**
15 min, puis (≈ l.201-218) l'`INSERT` (via `sql.transaction(insertQueries)`).

**Changements :**

1. **Supprimer** le pré-contrôle de capacité non atomique (la lecture `courseMeta`/`placesMax`,
   le `countRows`/`count`, et le `if (count + participants.length > placesMax) … course_full`).
2. **Conserver** le dup-check 15 min tel quel (idempotence), avant l'insertion.
3. **Remplacer** le bloc d'insertion par une transaction verrou + insertion gardée :

```js
const noms    = participants.map((p) => p.nom);
const enfants = participants.map((p) => p.enfant); // null possible
const n       = participants.length;

const lockQuery = sql`SELECT pg_advisory_xact_lock(${courseId})`;
const insertQuery = sql`
  INSERT INTO inscriptions (course_id, nom, courriel, telephone, enfant, message, newsletter, est_membre, created_at)
  SELECT ${courseId}, t.nom, ${courriel}, ${telephone}, t.enfant,
         CASE WHEN t.ord = 1 THEN ${message} ELSE NULL END,
         ${newsletter}, ${estMembre}, NOW()
  FROM UNNEST(${noms}::text[], ${enfants}::text[]) WITH ORDINALITY AS t(nom, enfant, ord)
  WHERE (SELECT COUNT(*) FROM inscriptions WHERE course_id = ${courseId}) + ${n}
        <= (SELECT places_max FROM courses WHERE id = ${courseId})
  RETURNING id`;

const txResults = await sql.transaction([lockQuery, insertQuery]);
const insertedRows = txResults[1] || [];
if (insertedRows.length === 0) {
  console.error("Course full (atomic guard):", courseId);
  return { statusCode: 200, body: JSON.stringify({ success: false, reason: "course_full" }) };
}
const ids = insertedRows.map((r) => r.id);
```

4. **Conserver** l'envoi du courriel de confirmation et la réponse `success` (avec `ids`), comme
   aujourd'hui.

> **Pourquoi c'est correct.** `pg_advisory_xact_lock(course_id)` sérialise les transactions
> concurrentes du **même cours** (la 2ᵉ attend la 1ʳᵉ). L'`INSERT … SELECT … WHERE count+N ≤ places_max`
> est une instruction distincte du verrou dans la transaction → sous READ COMMITTED elle prend un
> nouveau snapshot et **voit les inscriptions déjà committées** par la transaction précédemment
> sérialisée. Le `WHERE` rend l'insertion **tout-ou-rien** : si la capacité est dépassée, 0 ligne
> est insérée → `course_full`. Aucune nouvelle dépendance (on garde le driver `neon()` HTTP et le
> `sql.transaction` déjà utilisé).

> Note `est_membre` : `submission-created.js` calcule déjà `estMembre = data.est_membre === "oui"` ;
> la nouvelle insertion conserve cette colonne (présente dans l'INSERT actuel).

> Fallback : le code suppose déjà `sql.transaction` (utilisé pour les inserts actuels). On garde la
> même hypothèse ; pas de branche legacy ajoutée.

### 4.2 A3 — `netlify/functions/api.mjs`

- **Supprimer** le handler `POST /api/inscriptions` en entier (le bloc
  `if (method === "POST" && pathname === "/api/inscriptions") { … }`, ≈ l.127-260).
- **Supprimer** l'import devenu inutilisé :
  ```js
  import { sendInscriptionConfirmation, buildCourseLabel } from "./lib/sendInscriptionConfirmation.mjs";
  ```
  (uniquement consommé par ce handler).
- **Supprimer** `const MAX_INSCRIPTION_PARTICIPANTS = 8;` (uniquement utilisé par ce handler).
- **Conserver** : `import crypto`, `randomSlugSuffix()` (utilisés par l'admin, création de cours
  multi-créneaux), et le fichier `lib/sendInscriptionConfirmation.mjs` (toujours utilisé par
  `submission-created.js` via import dynamique).
- Mettre à jour le commentaire d'en-tête (l.5) qui liste `POST /api/inscriptions` parmi les routes.

## 5. Vérification (limites assumées)

Aucun harnais de test JS, et la concurrence ne se teste pas sans BD réelle. Plan :
- **Revue de la sémantique SQL** (l'argument advisory-lock ci-dessus) — vérification principale.
- `node --check netlify/functions/submission-created.js` et `node --check netlify/functions/api.mjs` → OK.
- `git grep` : plus aucune référence à `/api/inscriptions` côté front (déjà le cas) ; plus de
  `MAX_INSCRIPTION_PARTICIPANTS` ni d'import `sendInscriptionConfirmation` dans `api.mjs`.
- **`pytest` = 246** (aucun impact Python).
- **Recommandé si possible** : smoke de concurrence manuel sur une **branche Neon** (lancer 2
  inscriptions simultanées pour la dernière place → une seule réussit, l'autre `course_full`).
  À défaut, le raisonnement SQL fait foi.

## 6. Risques & rollback

| Risque | Prob. | Mitigation |
|---|---|---|
| `UNNEST(... WITH ORDINALITY)` mal géré par le driver neon | Faible | Tester la forme de requête ; `node --check` ; revue ; rollback = `git revert` |
| Régression du flux nominal (insertion simple) | Faible | Conserver dup-check + courriel ; comparer la réponse `success` à l'actuelle |
| Suppression de l'endpoint casse un appelant inconnu | Très faible | Vérifié : aucun appelant front ; le miroir FastAPI est indépendant ; historique git |
| Verrou advisory non libéré | Nulle | `pg_advisory_xact_lock` est **xact-scoped** : libéré automatiquement en fin de transaction |

## 7. Critères de succès

- [ ] Impossible de dépasser `places_max` même sous deux inscriptions concurrentes (garanti par
      le verrou + insertion gardée).
- [ ] Flux nominal inchangé : insertion des N participants, dup-check 15 min, courriel de
      confirmation, réponse `success` avec les `ids`.
- [ ] Capacité dépassée → `{ success: false, reason: "course_full" }` (0 ligne insérée).
- [ ] `POST /api/inscriptions` supprimé d'`api.mjs` + symboles inutilisés retirés ; `crypto`/
      `randomSlugSuffix`/admin intacts.
- [ ] `node --check` OK sur les deux fichiers ; `pytest` 246 ; aucune régression des routes
      `GET /api/cours` et admin.
