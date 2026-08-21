/**
 * Netlify Function: submission-created
 *
 * Triggered automatically when a Netlify Form receives a submission.
 * Syncs the inscription data to the Neon PostgreSQL database.
 */

const { neon } = require("@neondatabase/serverless");

const MAX_PARTICIPANTS = 8;

/**
 * Accents translittérés côté SQL (évite de dépendre de l'extension unaccent).
 * Doit rester synchronisé avec normaliserComparaison() ci-dessous : les deux
 * normalisations sont comparées sur le corpus réel par
 * scripts/verifier-normalisation-inscription.mjs.
 */
const SQL_ACCENTS_DE = "àâäáãåçéèêëíìîïñóòôöõúùûüýÿ";
const SQL_ACCENTS_VERS = "aaaaaaceeeeiiiinooooouuuuyy";

/**
 * Clé de comparaison d'un nom ou d'un champ « enfant ».
 * Ignore casse, accents, ponctuation et mentions d'âge, afin que
 * « Magalie Marcoux (12 ans) » et « MAgalie MArcoux » soient reconnues comme
 * la même personne lors d'une ressaisie — tout en gardant distincts deux
 * enfants différents d'un même parent.
 */
function normaliserComparaison(valeur) {
  return String(valeur == null ? "" : valeur)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)|[0-9]+\s*ans?|[0-9]+/g, " ")
    .replace(/[^a-z]/g, "");
}

module.exports.normaliserComparaison = normaliserComparaison;

/**
 * Accepte :
 * - texte lisible (nouveau) : une personne par ligne, option « — enfant : … »
 * - JSON historique : [{"nom":"…","enfant":null|string}, …]
 * - anciens champs plats nom / enfant
 */
function normalizeParticipants(data) {
  let raw = data.participants != null ? data.participants : data.participants_json;
  if (raw != null && typeof raw === "string") raw = raw.trim();
  if (raw) {
    if (raw.charAt(0) === "[") {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) {
          return arr
            .map((p) => ({
              nom: String((p && p.nom) || "").trim(),
              enfant:
                p && p.enfant != null && String(p.enfant).trim()
                  ? String(p.enfant).trim()
                  : null,
            }))
            .filter((p) => p.nom);
        }
      } catch (_) {
        /* fallback texte / champs plats */
      }
    }

    const fromText = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(.*?)\s*[—–-]\s*enfant\s*:\s*(.+)$/i);
        if (m) {
          return {
            nom: m[1].trim(),
            enfant: m[2].trim() || null,
          };
        }
        return { nom: line, enfant: null };
      })
      .filter((p) => p.nom);
    if (fromText.length > 0) return fromText;
  }
  const n = String(data.nom || "").trim();
  if (n) {
    const enf = data.enfant != null && String(data.enfant).trim() ? String(data.enfant).trim() : null;
    return [{ nom: n, enfant: enf }];
  }
  return [];
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const payload = body.payload || body;
    const data = payload.data && typeof payload.data === "object" ? payload.data : payload;

    const form_name =
      payload.form_name ||
      payload.form ||
      body.form_name ||
      (data && data["form-name"]) ||
      (data && data.form_name);

    console.log("Received submission:", JSON.stringify({ form_name, data_keys: Object.keys(data || {}) }));

    const isInscription =
      form_name === "inscription" ||
      (data && data["form-name"] === "inscription") ||
      (data && data.form_name === "inscription");
    if (!isInscription) {
      console.log(`Ignoring form: ${form_name}`);
      return { statusCode: 200, body: "OK - form ignored" };
    }

    console.log("Processing inscription:", JSON.stringify(data));

    const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

    if (!databaseUrl) {
      console.error("DATABASE_URL not configured");
      return { statusCode: 500, body: "Database not configured" };
    }

    const sql = neon(databaseUrl);

    const courriel = data.courriel || "";
    const telephone = data.telephone || "";
    const courseIdFromField =
      data.course_id != null && String(data.course_id).trim() !== "" ? String(data.course_id).trim() : "";
    const coursValeur = data.cours != null ? String(data.cours).trim() : "";
    const message = data.message || null;
    const newsletter = data.newsletter === "oui";
    const estMembre = data.est_membre === "oui";

    let courseId = null;

    const idSource = /^\d+$/.test(courseIdFromField) ? courseIdFromField : coursValeur;
    if (/^\d+$/.test(idSource)) {
      const byId = await sql`SELECT id FROM courses WHERE id = ${parseInt(idSource, 10)} LIMIT 1`;
      if (byId.length > 0) courseId = byId[0].id;
    }

    let baseNom;
    if (!courseId && coursValeur) {
      const parts = coursValeur.split(" - ");
      baseNom = parts[0].trim();
      const rest = parts.length > 1 ? parts.slice(1).join(" - ") : "";
      const dateSansParentheses = rest.replace(/\s*\([^)]*\)\s*$/, "").trim();

      if (baseNom && dateSansParentheses) {
        const exact = await sql`
          SELECT id FROM courses
          WHERE trim(nom) = ${baseNom} AND trim(coalesce(date_debut, '')) = ${dateSansParentheses}
          LIMIT 1
        `;
        if (exact.length > 0) courseId = exact[0].id;
      }

      if (!courseId && baseNom) {
        const byName = await sql`
          SELECT id FROM courses WHERE trim(nom) = ${baseNom} ORDER BY id DESC LIMIT 1
        `;
        if (byName.length > 0) courseId = byName[0].id;
      }

      if (!courseId && baseNom) {
        const likeRows = await sql`
          SELECT id, nom FROM courses
          WHERE ${coursValeur} ILIKE ('%' || nom || '%')
          ORDER BY length(nom) DESC
          LIMIT 1
        `;
        if (likeRows.length > 0) courseId = likeRows[0].id;
      }

      const iso = coursValeur.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (!courseId && iso) {
        const coursNomIso = coursValeur.split(/\s*-\s*/)[0].trim();
        const row = await sql`
          SELECT id FROM courses WHERE trim(nom) = ${coursNomIso} AND date_debut = ${iso[1]} LIMIT 1
        `;
        if (row.length > 0) courseId = row[0].id;
      }
    }

    console.log("Resolved course:", { courseId, coursValeur: coursValeur.slice(0, 120) });

    if (!courseId) {
      console.error("Course not found for cours field:", coursValeur);
      return {
        statusCode: 200,
        body: `Warning: cours introuvable en base (valeur: ${coursValeur.slice(0, 200)}). Inscription seulement dans Netlify Forms.`,
      };
    }

    const participants = normalizeParticipants(data);
    if (participants.length < 1) {
      console.error("No participants (missing names)");
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, reason: "no_participants" }),
      };
    }
    if (participants.length > MAX_PARTICIPANTS) {
      console.error("Too many participants:", participants.length);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, reason: "too_many_participants" }),
      };
    }

    // Écarte les personnes DÉJÀ inscrites à ce cours avec le même courriel.
    // Aucune fenêtre temporelle : une même personne au même cours n'est jamais une
    // inscription légitime, même des jours plus tard. Les re-soumissions observées
    // s'étalaient de 27 minutes à 7 jours — un délai fixe ne peut pas les couvrir.
    // Un désistement traité par l'admin supprime la ligne, ce qui rouvre la
    // réinscription.
    const dejaInscrits = await sql`
      SELECT nom, enfant FROM inscriptions
      WHERE course_id = ${courseId} AND lower(trim(courriel)) = lower(trim(${courriel}))
    `;
    const clesExistantes = new Set(
      (dejaInscrits || []).map((r) => `${normaliserComparaison(r.nom)}|${normaliserComparaison(r.enfant)}`)
    );
    const estDejaInscrit = (p) =>
      clesExistantes.has(`${normaliserComparaison(p.nom)}|${normaliserComparaison(p.enfant)}`);

    const ignores = participants.filter(estDejaInscrit);
    const aInscrire = participants.filter((p) => !estDejaInscrit(p));

    if (aInscrire.length === 0) {
      // Re-soumission intégrale : rien à créer, et surtout aucun courriel — c'est
      // précisément le doublon que voyait l'atelier.
      console.log(
        `Re-soumission ignorée : ${participants.length} personne(s) déjà inscrite(s) au cours ${courseId}`
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          duplicate: true,
          reason: "already_registered",
          skipped_duplicates: ignores.length,
          course_id: courseId,
        }),
      };
    }

    const noms = aInscrire.map((p) => p.nom);
    const enfants = aInscrire.map((p) => p.enfant); // null possible
    // Clés de comparaison calculées ici pour n'avoir qu'une seule copie de
    // l'expression de normalisation en SQL (appliquée aux lignes déjà stockées).
    const nomsCle = aInscrire.map((p) => normaliserComparaison(p.nom));
    const enfantsCle = aInscrire.map((p) => normaliserComparaison(p.enfant));

    // Verrou applicatif par cours : sérialise les inscriptions concurrentes du même cours.
    const lockQuery = sql`SELECT pg_advisory_xact_lock(${courseId})`;
    // Insertion dédoublonnée et plafonnée, en une seule instruction sous le verrou.
    // Le NOT EXISTS reprend le filtre déjà appliqué en JavaScript : il sert de
    // garde-fou atomique contre deux soumissions concurrentes qui auraient toutes
    // deux lu la base avant que l'une n'écrive.
    const insertQuery = sql`
      WITH entrants AS (
        SELECT t.nom, t.enfant, t.nom_cle, t.enfant_cle, t.ord
        FROM UNNEST(${noms}::text[], ${enfants}::text[], ${nomsCle}::text[], ${enfantsCle}::text[])
             WITH ORDINALITY AS t(nom, enfant, nom_cle, enfant_cle, ord)
      ),
      nouveaux AS (
        SELECT e.nom, e.enfant, e.ord
        FROM entrants e
        WHERE NOT EXISTS (
          SELECT 1 FROM inscriptions d
          WHERE d.course_id = ${courseId}
            AND lower(trim(d.courriel)) = lower(trim(${courriel}))
            AND regexp_replace(
                  regexp_replace(
                    translate(lower(coalesce(d.nom, '')), ${SQL_ACCENTS_DE}, ${SQL_ACCENTS_VERS}),
                    '\\(.*?\\)|[0-9]+\\s*ans?|[0-9]+', ' ', 'g'),
                  '[^a-z]', '', 'g') = e.nom_cle
            AND regexp_replace(
                  regexp_replace(
                    translate(lower(coalesce(d.enfant, '')), ${SQL_ACCENTS_DE}, ${SQL_ACCENTS_VERS}),
                    '\\(.*?\\)|[0-9]+\\s*ans?|[0-9]+', ' ', 'g'),
                  '[^a-z]', '', 'g') = e.enfant_cle
        )
      ),
      capacite AS (
        SELECT (SELECT COUNT(*) FROM inscriptions WHERE course_id = ${courseId}) AS occupees,
               (SELECT places_max FROM courses WHERE id = ${courseId}) AS maximum,
               (SELECT COUNT(*) FROM nouveaux) AS demandees
      )
      INSERT INTO inscriptions (course_id, nom, courriel, telephone, enfant, message, newsletter, est_membre, created_at)
      SELECT ${courseId}, n.nom, ${courriel}, ${telephone}, n.enfant,
             CASE WHEN n.ord = 1 THEN ${message} ELSE NULL END,
             ${newsletter}, ${estMembre}, NOW()
      FROM nouveaux n, capacite c
      WHERE c.demandees > 0 AND c.occupees + c.demandees <= c.maximum
      RETURNING id, nom, enfant
    `;

    // READ COMMITTED est requis : après le verrou, le COUNT de l'insertion doit voir les
    // lignes committées par la transaction concurrente précédemment sérialisée.
    const txResults = await sql.transaction([lockQuery, insertQuery], { isolationLevel: "ReadCommitted" });
    const insertedRows = txResults[1] || [];

    const courseRows = await sql`
      SELECT nom, date_debut, jour, heure FROM courses WHERE id = ${courseId} LIMIT 1
    `;
    const { sendInscriptionConfirmation, sendInscriptionNotification, buildCourseLabel } = await import(
      "./lib/sendInscriptionConfirmation.mjs"
    );
    const courseLabel = buildCourseLabel(courseRows[0]);

    if (insertedRows.length === 0) {
      // Des personnes nouvelles restaient à inscrire (sinon on serait sorti plus haut) :
      // c'est donc le plafond de places qui a bloqué. L'atelier doit le savoir — une
      // demande refusée reste une demande.
      console.error(`Cours complet : cours ${courseId}, ${aInscrire.length} place(s) demandée(s)`);
      await sendInscriptionNotification({
        courseLabel,
        participants: aInscrire,
        courriel,
        telephone,
        estMembre,
        propreArgile: data.propre_argile || null,
        newsletter,
        message,
        ignores,
        statut: "cours_complet",
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, reason: "course_full", course_id: courseId }),
      };
    }

    const ids = insertedRows.map((r) => r.id);
    console.log("Inscriptions created (atomic):", ids, "— ignorées (doublons):", ignores.length);

    const inscritsReels = insertedRows.map((r) => ({ nom: r.nom, enfant: r.enfant || null }));

    // Le résultat est passé à la notification interne : un échec de confirmation
    // doit être visible par l'atelier, pas seulement dans les logs de fonctions.
    const confirmation = await sendInscriptionConfirmation({
      to: courriel,
      participantNames: inscritsReels.map((p) => p.nom),
      courseLabel,
    });

    // Notification à l'atelier : envoyée seulement quand au moins une place a été
    // créée, donc jamais pour une re-soumission intégrale.
    await sendInscriptionNotification({
      courseLabel,
      participants: inscritsReels,
      courriel,
      telephone,
      estMembre,
      propreArgile: data.propre_argile || null,
      newsletter,
      message,
      ignores,
      confirmation,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        inscription_ids: ids,
        inscription_id: ids[0],
        count: ids.length,
        skipped_duplicates: ignores.length,
        course_id: courseId,
      }),
    };
  } catch (error) {
    console.error("Error processing submission:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
