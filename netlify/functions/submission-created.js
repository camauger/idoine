/**
 * Netlify Function: submission-created
 *
 * Triggered automatically when a Netlify Form receives a submission.
 * Syncs the inscription data to the Neon PostgreSQL database.
 */

const { neon } = require("@neondatabase/serverless");

const MAX_PARTICIPANTS = 8;

function normalizeParticipants(data) {
  let raw = data.participants_json;
  if (raw != null && typeof raw === "string") raw = raw.trim();
  if (raw) {
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
      /* fallback below */
    }
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

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const enfantStr = p.enfant || "";
      const dupCheck = await sql`
        SELECT id FROM inscriptions
        WHERE course_id = ${courseId}
          AND lower(trim(courriel)) = lower(trim(${courriel}))
          AND lower(trim(nom)) = lower(trim(${p.nom}))
          AND coalesce(trim(enfant), '') = coalesce(trim(${enfantStr}), '')
          AND created_at > now() - interval '15 minutes'
        LIMIT 1
      `;
      if (dupCheck && dupCheck.length > 0) {
        console.log("Duplicate batch rejected (participant", i, "):", dupCheck[0].id);
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            duplicate: true,
            inscription_id: dupCheck[0].id,
            course_id: courseId,
          }),
        };
      }
    }

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

    const courseRows = await sql`
      SELECT nom, date_debut, jour, heure FROM courses WHERE id = ${courseId} LIMIT 1
    `;
    const { sendInscriptionConfirmation, buildCourseLabel } = await import("./lib/sendInscriptionConfirmation.mjs");
    const courseLabel = buildCourseLabel(courseRows[0]);
    await sendInscriptionConfirmation({
      to: courriel,
      participantNames: participants.map((p) => p.nom),
      courseLabel,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        inscription_ids: ids,
        inscription_id: ids[0],
        count: ids.length,
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
