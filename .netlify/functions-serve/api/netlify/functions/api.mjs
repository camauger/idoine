
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/api.mjs
import { neon } from "@neondatabase/serverless";
import jwt from "jsonwebtoken";

// netlify/functions/lib/sendInscriptionConfirmation.mjs
var RESEND_URL = "https://api.resend.com/emails";
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildCourseLabel(course) {
  if (!course) return "Non pr\xE9cis\xE9";
  const parts = [course.nom || ""].filter(Boolean);
  const details = [];
  if (course.date_debut) details.push(course.date_debut);
  if (course.jour) details.push(course.jour);
  if (course.heure) details.push(course.heure);
  if (details.length) parts.push("(" + details.join(" - ") + ")");
  const out = parts.join(" ").trim();
  return out || "Votre cours";
}
async function sendInscriptionConfirmation({ to, courseLabel, participantNames, nom }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONFIRMATION_EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(
      "[sendInscriptionConfirmation] RESEND_API_KEY ou CONFIRMATION_EMAIL_FROM manquant \u2014 courriel non envoy\xE9"
    );
    return { sent: false, reason: "not_configured" };
  }
  const addr = (to || "").trim();
  if (!addr || !addr.includes("@")) {
    console.warn("[sendInscriptionConfirmation] courriel destinataire invalide");
    return { sent: false, reason: "invalid_to" };
  }
  let names = Array.isArray(participantNames) ? participantNames.map((n) => String(n || "").trim()).filter(Boolean) : [];
  if (names.length === 0 && nom) {
    const one = String(nom).trim();
    if (one) names = [one];
  }
  if (names.length === 0) names = [""];
  const prenom = (names[0] || "").split(/\s+/)[0] || "Bonjour";
  const label = courseLabel || "votre cours";
  const plusieurs = names.length > 1;
  const listeTexte = names.filter(Boolean).join(", ");
  const listeHtml = names.filter(Boolean).map((n) => `<li>${escapeHtml(n)}</li>`).join("");
  const subject = "Votre demande d'inscription \u2014 Ateliers St-Elme";
  const corpsListeTexte = plusieurs ? `Personnes inscrites :
${names.filter(Boolean).map((n) => "\u2022 " + n).join("\n")}

` : "";
  const corpsListeHtml = plusieurs ? `<p>Personnes inscrites&nbsp;:</p><ul>${listeHtml}</ul>` : `<p><strong>${escapeHtml(names[0] || "Participant")}</strong></p>`;
  const phrasePlaces = plusieurs ? "Nous avons bien re\xE7u votre demande d'inscription pour plusieurs personnes." : "Nous avons bien re\xE7u votre demande d'inscription.";
  const text = `Bonjour ${prenom},

${phrasePlaces}
Cours : ${label}.

${corpsListeTexte}Votre demande a \xE9t\xE9 envoy\xE9e avec succ\xE8s. Nous vous contacterons dans les prochains jours pour confirmer ${plusieurs ? "les places" : "votre place"} et vous transmettre les informations de paiement.

\u2014 L'\xE9quipe des Ateliers St-Elme
https://atelierstelme.ca
Pour toute question : info@atelierstelme.ca`;
  const html = `<p>Bonjour ${escapeHtml(prenom)},</p>
<p>${phrasePlaces} Cours&nbsp;: <strong>${escapeHtml(label)}</strong>.</p>
${corpsListeHtml}
<p>Votre demande a \xE9t\xE9 envoy\xE9e avec succ\xE8s. Nous vous contacterons dans les prochains jours pour confirmer ${plusieurs ? "les places" : "votre place"} et vous transmettre les informations de paiement.</p>
<p>\u2014 L'\xE9quipe des Ateliers St-Elme</p>
<p><a href="https://atelierstelme.ca">atelierstelme.ca</a> \u2014 <a href="mailto:info@atelierstelme.ca">info@atelierstelme.ca</a></p>`;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [addr],
        subject,
        text,
        html
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[sendInscriptionConfirmation] Resend error:", res.status, data);
      return { sent: false, reason: "api_error", status: res.status, data };
    }
    console.log("[sendInscriptionConfirmation] envoy\xE9 \xE0", addr, listeTexte || prenom);
    return { sent: true, id: data.id };
  } catch (e) {
    console.error("[sendInscriptionConfirmation] fetch error:", e);
    return { sent: false, reason: "fetch_error", error: e.message };
  }
}

// netlify/functions/api.mjs
var SECRET_KEY = process.env.SECRET_KEY || "change-me-in-production";
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
var MAX_INSCRIPTION_PARTICIPANTS = 8;
function corsHeaders(req) {
  const origin = req.headers.get("origin");
  const ok = origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin.includes("netlify") || origin.includes("atelierstelme"));
  if (!ok) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
function createToken() {
  return jwt.sign({ admin: true }, SECRET_KEY, { expiresIn: "24h" });
}
function verifyToken(req) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  try {
    jwt.verify(token, SECRET_KEY);
    return true;
  } catch {
    return false;
  }
}
function jsonResponse(data, status = 200, req = null) {
  const headers = {
    "Content-Type": "application/json",
    // Les places restantes changent à chaque inscription : ne pas mettre en cache (navigateur / CDN)
    "Cache-Control": "private, no-store, no-cache, must-revalidate",
    ...req ? corsHeaders(req) : {}
  };
  return new Response(JSON.stringify(data), { status, headers });
}
function errorResponse(message, status = 400, req = null) {
  return jsonResponse({ detail: message }, status, req);
}
var api_default = async (req, context) => {
  const url = new URL(req.url);
  let pathname = url.pathname;
  if (pathname.startsWith("/.netlify/functions/api")) {
    pathname = "/api" + pathname.slice("/.netlify/functions/api".length) || "/api";
  }
  const method = req.method;
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...corsHeaders(req), "Access-Control-Max-Age": "86400" } });
  }
  const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  if (!databaseUrl) {
    return jsonResponse({ detail: "DATABASE_URL non configur\xE9e" }, 500, req);
  }
  const sql = neon(databaseUrl);
  try {
    if (method === "GET" && (pathname === "/api/cours" || pathname === "/api/cours/")) {
      const actifOnly = url.searchParams.get("actif_only") !== "false";
      const courses = actifOnly ? await sql`SELECT * FROM courses WHERE actif = true ORDER BY discipline, type_cours, jour` : await sql`SELECT * FROM courses ORDER BY discipline, type_cours, jour`;
      const counts = await sql`
        SELECT course_id, COUNT(*)::int AS cnt
        FROM inscriptions
        GROUP BY course_id
      `;
      const countByCourse = Object.fromEntries((counts || []).map((r) => [r.course_id, r.cnt]));
      const result = (courses || []).map((c) => {
        const count = countByCourse[c.id] || 0;
        const places_restantes = Math.max(0, (c.places_max || 0) - count);
        return { ...c, places_restantes };
      });
      return jsonResponse(result, 200, req);
    }
    const coursMatch = pathname.match(/^\/api\/cours\/(.+)$/);
    if (method === "GET" && coursMatch) {
      const slugOrId = decodeURIComponent(coursMatch[1]);
      const byId = /^\d+$/.test(slugOrId);
      const rows = byId ? await sql`SELECT * FROM courses WHERE id = ${parseInt(slugOrId, 10)}` : await sql`SELECT * FROM courses WHERE slug = ${slugOrId}`;
      const course = rows && rows[0] || null;
      if (!course) {
        return errorResponse("Cours non trouv\xE9", 404, req);
      }
      const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM inscriptions WHERE course_id = ${course.id}`;
      const count = countRows && countRows[0] && countRows[0].cnt || 0;
      const places_restantes = Math.max(0, (course.places_max || 0) - count);
      const out = { ...course, places_restantes };
      return jsonResponse(out, 200, req);
    }
    if (method === "POST" && pathname === "/api/inscriptions") {
      let body;
      try {
        body = await req.json();
      } catch {
        return errorResponse("Body JSON invalide", 400, req);
      }
      const {
        course_id,
        cours: coursNom,
        nom,
        courriel,
        telephone,
        participants: participantsInput,
        enfant = null,
        jour_prefere = null,
        horaire_prefere = null,
        message = null,
        newsletter = false,
        est_membre: estMembreBody
      } = body;
      let participants = [];
      if (Array.isArray(participantsInput) && participantsInput.length > 0) {
        participants = participantsInput.map((p) => ({
          nom: String(p && p.nom || "").trim(),
          enfant: p && p.enfant != null && String(p.enfant).trim() ? String(p.enfant).trim() : null
        })).filter((p) => p.nom);
      } else if (nom && String(nom).trim()) {
        participants = [
          {
            nom: String(nom).trim(),
            enfant: enfant != null && String(enfant).trim() ? String(enfant).trim() : null
          }
        ];
      }
      if (!courriel || !telephone || participants.length < 1) {
        return errorResponse("courriel, telephone et au moins un participant (nom) requis", 400, req);
      }
      if (participants.length > MAX_INSCRIPTION_PARTICIPANTS) {
        return errorResponse(`Maximum ${MAX_INSCRIPTION_PARTICIPANTS} personnes par demande`, 400, req);
      }
      let course = null;
      if (course_id) {
        const rows = await sql`SELECT * FROM courses WHERE id = ${course_id}`;
        course = rows && rows[0] || null;
      }
      if (!course && coursNom) {
        const rows = await sql`SELECT * FROM courses WHERE nom = ${coursNom}`;
        course = rows && rows[0] || null;
      }
      if (!course) {
        return errorResponse("Cours non trouv\xE9 (course_id ou cours invalide)", 400, req);
      }
      const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM inscriptions WHERE course_id = ${course.id}`;
      const count = countRows && countRows[0] && countRows[0].cnt || 0;
      if (count + participants.length > (course.places_max || 0)) {
        return errorResponse(
          "Ce cours est complet ou il ne reste pas assez de places pour ce nombre de personnes.",
          400,
          req
        );
      }
      const estMembreBool = estMembreBody === true || estMembreBody === "oui" || estMembreBody === "true";
      for (const p of participants) {
        const enfantVal = p.enfant || "";
        const dupRows = await sql`
          SELECT id, course_id, nom, courriel, telephone, enfant, jour_prefere, horaire_prefere, message, newsletter, created_at
          FROM inscriptions
          WHERE course_id = ${course.id}
            AND lower(trim(courriel)) = lower(trim(${courriel}))
            AND lower(trim(nom)) = lower(trim(${p.nom}))
            AND coalesce(trim(enfant), '') = coalesce(trim(${enfantVal}), '')
            AND created_at > now() - interval '15 minutes'
          LIMIT 1
        `;
        if (dupRows && dupRows[0]) {
          return jsonResponse({ ...dupRows[0], course_nom: course.nom }, 200, req);
        }
      }
      const createdAt = /* @__PURE__ */ new Date();
      const insertQueries = participants.map((p, index) => {
        const msg = index === 0 ? message : null;
        const jp = index === 0 ? jour_prefere : null;
        const hp = index === 0 ? horaire_prefere : null;
        return sql`
          INSERT INTO inscriptions (course_id, nom, courriel, telephone, enfant, jour_prefere, horaire_prefere, message, newsletter, est_membre, created_at)
          VALUES (${course.id}, ${p.nom}, ${courriel}, ${telephone}, ${p.enfant}, ${jp}, ${hp}, ${msg}, ${newsletter}, ${estMembreBool}, ${createdAt})
          RETURNING id, course_id, nom, courriel, telephone, enfant, jour_prefere, horaire_prefere, message, newsletter, est_membre, created_at
        `;
      });
      let insertResults;
      if (typeof sql.transaction === "function") {
        insertResults = await sql.transaction(insertQueries, { isolationLevel: "ReadCommitted" });
      } else {
        insertResults = [];
        for (const q of insertQueries) {
          insertResults.push(await q);
        }
      }
      const firstRow = insertResults[0] && insertResults[0][0];
      const ids = insertResults.map((r) => r[0].id);
      const courseLabel = buildCourseLabel(course);
      await sendInscriptionConfirmation({
        to: courriel,
        participantNames: participants.map((p) => p.nom),
        courseLabel
      });
      return jsonResponse(
        {
          ...firstRow || {},
          inscription_ids: ids,
          count: ids.length,
          course_nom: course.nom
        },
        201,
        req
      );
    }
    if (method === "POST" && pathname === "/api/admin/login") {
      let body;
      try {
        body = await req.json();
      } catch {
        return errorResponse("Body JSON invalide", 400, req);
      }
      if (body.password !== ADMIN_PASSWORD) {
        return errorResponse("Mot de passe incorrect", 401, req);
      }
      return jsonResponse({ access_token: createToken(), token_type: "bearer" }, 200, req);
    }
    if (pathname.startsWith("/api/admin/")) {
      if (!verifyToken(req)) {
        return errorResponse("Non autoris\xE9", 401, req);
      }
      if (method === "GET" && pathname === "/api/admin/courses") {
        const courses = await sql`SELECT * FROM courses ORDER BY discipline, nom`;
        const counts = await sql`
          SELECT course_id, COUNT(*)::int AS cnt
          FROM inscriptions
          GROUP BY course_id
        `;
        const countByCourse = Object.fromEntries((counts || []).map((r) => [r.course_id, r.cnt]));
        const result = (courses || []).map((c) => {
          const count = countByCourse[c.id] || 0;
          const places_restantes = Math.max(0, (c.places_max || 0) - count);
          return { ...c, places_restantes };
        });
        return jsonResponse(result, 200, req);
      }
      const adminCoursePut = pathname.match(/^\/api\/admin\/courses\/(\d+)$/);
      if (method === "PUT" && adminCoursePut) {
        const courseId = parseInt(adminCoursePut[1], 10);
        let body;
        try {
          body = await req.json();
        } catch {
          return errorResponse("Body JSON invalide", 400, req);
        }
        const existing = await sql`SELECT id FROM courses WHERE id = ${courseId}`;
        if (!existing || !existing[0]) {
          return errorResponse("Cours non trouv\xE9", 404, req);
        }
        const pm = body.places_max;
        const placesMax = typeof pm === "number" && Number.isFinite(pm) ? Math.trunc(pm) : parseInt(String(pm ?? ""), 10);
        if (Number.isNaN(placesMax) || placesMax < 0) {
          return errorResponse("places_max requis (entier \u2265 0)", 400, req);
        }
        const updated = await sql`
          UPDATE courses SET places_max = ${placesMax} WHERE id = ${courseId} RETURNING *
        `;
        const c = updated[0];
        const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM inscriptions WHERE course_id = ${courseId}`;
        const count = countRows && countRows[0] && countRows[0].cnt || 0;
        const places_restantes = Math.max(0, (c.places_max || 0) - count);
        return jsonResponse({ ...c, places_restantes }, 200, req);
      }
      if (method === "GET" && pathname === "/api/admin/inscriptions") {
        const courseId = url.searchParams.get("course_id");
        let inscriptions;
        if (courseId) {
          inscriptions = await sql`
            SELECT i.*, c.nom as course_nom, c.date_debut as course_date
            FROM inscriptions i 
            JOIN courses c ON i.course_id = c.id 
            WHERE i.course_id = ${parseInt(courseId, 10)}
            ORDER BY i.created_at DESC
          `;
        } else {
          inscriptions = await sql`
            SELECT i.*, c.nom as course_nom, c.date_debut as course_date
            FROM inscriptions i 
            JOIN courses c ON i.course_id = c.id 
            ORDER BY i.created_at DESC
          `;
        }
        return jsonResponse(inscriptions || [], 200, req);
      }
      if (method === "GET" && pathname === "/api/admin/inscriptions/export") {
        const courseId = url.searchParams.get("course_id");
        let inscriptions;
        if (courseId) {
          inscriptions = await sql`
            SELECT i.*, c.nom as course_nom, c.date_debut as course_date
            FROM inscriptions i 
            JOIN courses c ON i.course_id = c.id 
            WHERE i.course_id = ${parseInt(courseId, 10)}
            ORDER BY i.created_at DESC
          `;
        } else {
          inscriptions = await sql`
            SELECT i.*, c.nom as course_nom, c.date_debut as course_date
            FROM inscriptions i 
            JOIN courses c ON i.course_id = c.id 
            ORDER BY i.created_at DESC
          `;
        }
        const rows = [["id", "date_inscription", "cours", "date_cours", "nom", "courriel", "telephone", "enfant", "message", "newsletter", "est_membre"]];
        for (const i of inscriptions || []) {
          rows.push([
            i.id,
            i.created_at ? new Date(i.created_at).toISOString() : "",
            i.course_nom || "",
            i.course_date || "",
            i.nom || "",
            i.courriel || "",
            i.telephone || "",
            i.enfant || "",
            (i.message || "").replace(/\n/g, " "),
            i.newsletter ? "oui" : "non",
            i.est_membre ? "oui" : "non"
          ]);
        }
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=inscriptions.csv",
            ...corsHeaders(req)
          }
        });
      }
    }
    return errorResponse("Not Found", 404, req);
  } catch (err) {
    console.error("API error:", err);
    return jsonResponse({ detail: err.message || "Erreur serveur" }, 500, req);
  }
};
export {
  api_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvYXBpLm1qcyIsICJuZXRsaWZ5L2Z1bmN0aW9ucy9saWIvc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uLm1qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uOiBBUEkgY291cnMgKyBpbnNjcmlwdGlvbnMgKyBhZG1pbiAoTmVvbiBEQilcbiAqIFJcdTAwRTlwbGlxdWUgbGUgY29tcG9ydGVtZW50IGR1IGJhY2tlbmQgRmFzdEFQSSBwb3VyIGxlIGZyb250IHZhbmlsbGEuXG4gKiBSb3V0ZXM6IFxuICogICBHRVQgL2FwaS9jb3VycywgR0VUIC9hcGkvY291cnMvOnNsdWcsIFBPU1QgL2FwaS9pbnNjcmlwdGlvbnNcbiAqICAgUE9TVCAvYXBpL2FkbWluL2xvZ2luLCBHRVQgL2FwaS9hZG1pbi9jb3Vyc2VzLCBQVVQgL2FwaS9hZG1pbi9jb3Vyc2VzLzppZFxuICogICBHRVQgL2FwaS9hZG1pbi9pbnNjcmlwdGlvbnMsIEdFVCAvYXBpL2FkbWluL2luc2NyaXB0aW9ucy9leHBvcnRcbiAqL1xuaW1wb3J0IHsgbmVvbiB9IGZyb20gXCJAbmVvbmRhdGFiYXNlL3NlcnZlcmxlc3NcIjtcbmltcG9ydCBqd3QgZnJvbSBcImpzb253ZWJ0b2tlblwiO1xuaW1wb3J0IHtcbiAgc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uLFxuICBidWlsZENvdXJzZUxhYmVsLFxufSBmcm9tIFwiLi9saWIvc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uLm1qc1wiO1xuXG5jb25zdCBTRUNSRVRfS0VZID0gcHJvY2Vzcy5lbnYuU0VDUkVUX0tFWSB8fCBcImNoYW5nZS1tZS1pbi1wcm9kdWN0aW9uXCI7XG5jb25zdCBBRE1JTl9QQVNTV09SRCA9IHByb2Nlc3MuZW52LkFETUlOX1BBU1NXT1JEIHx8IFwiYWRtaW5cIjtcbmNvbnN0IE1BWF9JTlNDUklQVElPTl9QQVJUSUNJUEFOVFMgPSA4O1xuXG5mdW5jdGlvbiBjb3JzSGVhZGVycyhyZXEpIHtcbiAgY29uc3Qgb3JpZ2luID0gcmVxLmhlYWRlcnMuZ2V0KFwib3JpZ2luXCIpO1xuICBjb25zdCBvayA9IG9yaWdpbiAmJiAob3JpZ2luLnN0YXJ0c1dpdGgoXCJodHRwOi8vbG9jYWxob3N0XCIpIHx8IG9yaWdpbi5zdGFydHNXaXRoKFwiaHR0cDovLzEyNy4wLjAuMVwiKSB8fCBvcmlnaW4uaW5jbHVkZXMoXCJuZXRsaWZ5XCIpIHx8IG9yaWdpbi5pbmNsdWRlcyhcImF0ZWxpZXJzdGVsbWVcIikpO1xuICBpZiAoIW9rKSByZXR1cm4ge307XG4gIHJldHVybiB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogb3JpZ2luLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIkdFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlNcIixcbiAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCJDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb25cIixcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVG9rZW4oKSB7XG4gIHJldHVybiBqd3Quc2lnbih7IGFkbWluOiB0cnVlIH0sIFNFQ1JFVF9LRVksIHsgZXhwaXJlc0luOiBcIjI0aFwiIH0pO1xufVxuXG5mdW5jdGlvbiB2ZXJpZnlUb2tlbihyZXEpIHtcbiAgY29uc3QgYXV0aCA9IHJlcS5oZWFkZXJzLmdldChcImF1dGhvcml6YXRpb25cIik7XG4gIGlmICghYXV0aCB8fCAhYXV0aC5zdGFydHNXaXRoKFwiQmVhcmVyIFwiKSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCB0b2tlbiA9IGF1dGguc2xpY2UoNyk7XG4gIHRyeSB7XG4gICAgand0LnZlcmlmeSh0b2tlbiwgU0VDUkVUX0tFWSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBqc29uUmVzcG9uc2UoZGF0YSwgc3RhdHVzID0gMjAwLCByZXEgPSBudWxsKSB7XG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgLy8gTGVzIHBsYWNlcyByZXN0YW50ZXMgY2hhbmdlbnQgXHUwMEUwIGNoYXF1ZSBpbnNjcmlwdGlvbiA6IG5lIHBhcyBtZXR0cmUgZW4gY2FjaGUgKG5hdmlnYXRldXIgLyBDRE4pXG4gICAgXCJDYWNoZS1Db250cm9sXCI6IFwicHJpdmF0ZSwgbm8tc3RvcmUsIG5vLWNhY2hlLCBtdXN0LXJldmFsaWRhdGVcIixcbiAgICAuLi4ocmVxID8gY29yc0hlYWRlcnMocmVxKSA6IHt9KSxcbiAgfTtcbiAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeShkYXRhKSwgeyBzdGF0dXMsIGhlYWRlcnMgfSk7XG59XG5cbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UobWVzc2FnZSwgc3RhdHVzID0gNDAwLCByZXEgPSBudWxsKSB7XG4gIHJldHVybiBqc29uUmVzcG9uc2UoeyBkZXRhaWw6IG1lc3NhZ2UgfSwgc3RhdHVzLCByZXEpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyAocmVxLCBjb250ZXh0KSA9PiB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCk7XG4gIC8vIE5ldGxpZnkgcmV3cml0ZSBlbnZvaWUgLy5uZXRsaWZ5L2Z1bmN0aW9ucy9hcGkvOnNwbGF0IFx1MjE5MiBub3JtYWxpc2VyIGVuIC9hcGkvLi4uXG4gIGxldCBwYXRobmFtZSA9IHVybC5wYXRobmFtZTtcbiAgaWYgKHBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2FwaVwiKSkge1xuICAgIHBhdGhuYW1lID0gXCIvYXBpXCIgKyBwYXRobmFtZS5zbGljZShcIi8ubmV0bGlmeS9mdW5jdGlvbnMvYXBpXCIubGVuZ3RoKSB8fCBcIi9hcGlcIjtcbiAgfVxuICBjb25zdCBtZXRob2QgPSByZXEubWV0aG9kO1xuXG4gIGlmIChtZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7IHN0YXR1czogMjA0LCBoZWFkZXJzOiB7IC4uLmNvcnNIZWFkZXJzKHJlcSksIFwiQWNjZXNzLUNvbnRyb2wtTWF4LUFnZVwiOiBcIjg2NDAwXCIgfSB9KTtcbiAgfVxuXG4gIGNvbnN0IGRhdGFiYXNlVXJsID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMIHx8IHByb2Nlc3MuZW52Lk5FVExJRllfREFUQUJBU0VfVVJMIHx8IHByb2Nlc3MuZW52Lk5FVExJRllfREFUQUJBU0VfVVJMX1VOUE9PTEVEO1xuICBpZiAoIWRhdGFiYXNlVXJsKSB7XG4gICAgcmV0dXJuIGpzb25SZXNwb25zZSh7IGRldGFpbDogXCJEQVRBQkFTRV9VUkwgbm9uIGNvbmZpZ3VyXHUwMEU5ZVwiIH0sIDUwMCwgcmVxKTtcbiAgfVxuXG4gIGNvbnN0IHNxbCA9IG5lb24oZGF0YWJhc2VVcmwpO1xuXG4gIHRyeSB7XG4gICAgLy8gR0VUIC9hcGkvY291cnMgXHUyMTkyIGxpc3RlIGRlcyBjb3VycyBhY3RpZnMgYXZlYyBwbGFjZXNfcmVzdGFudGVzXG4gICAgaWYgKG1ldGhvZCA9PT0gXCJHRVRcIiAmJiAocGF0aG5hbWUgPT09IFwiL2FwaS9jb3Vyc1wiIHx8IHBhdGhuYW1lID09PSBcIi9hcGkvY291cnMvXCIpKSB7XG4gICAgICBjb25zdCBhY3RpZk9ubHkgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImFjdGlmX29ubHlcIikgIT09IFwiZmFsc2VcIjtcbiAgICAgIGNvbnN0IGNvdXJzZXMgPSBhY3RpZk9ubHlcbiAgICAgICAgPyBhd2FpdCBzcWxgU0VMRUNUICogRlJPTSBjb3Vyc2VzIFdIRVJFIGFjdGlmID0gdHJ1ZSBPUkRFUiBCWSBkaXNjaXBsaW5lLCB0eXBlX2NvdXJzLCBqb3VyYFxuICAgICAgICA6IGF3YWl0IHNxbGBTRUxFQ1QgKiBGUk9NIGNvdXJzZXMgT1JERVIgQlkgZGlzY2lwbGluZSwgdHlwZV9jb3Vycywgam91cmA7XG4gICAgICBjb25zdCBjb3VudHMgPSBhd2FpdCBzcWxgXG4gICAgICAgIFNFTEVDVCBjb3Vyc2VfaWQsIENPVU5UKCopOjppbnQgQVMgY250XG4gICAgICAgIEZST00gaW5zY3JpcHRpb25zXG4gICAgICAgIEdST1VQIEJZIGNvdXJzZV9pZFxuICAgICAgYDtcbiAgICAgIGNvbnN0IGNvdW50QnlDb3Vyc2UgPSBPYmplY3QuZnJvbUVudHJpZXMoKGNvdW50cyB8fCBbXSkubWFwKChyKSA9PiBbci5jb3Vyc2VfaWQsIHIuY250XSkpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gKGNvdXJzZXMgfHwgW10pLm1hcCgoYykgPT4ge1xuICAgICAgICBjb25zdCBjb3VudCA9IGNvdW50QnlDb3Vyc2VbYy5pZF0gfHwgMDtcbiAgICAgICAgY29uc3QgcGxhY2VzX3Jlc3RhbnRlcyA9IE1hdGgubWF4KDAsIChjLnBsYWNlc19tYXggfHwgMCkgLSBjb3VudCk7XG4gICAgICAgIHJldHVybiB7IC4uLmMsIHBsYWNlc19yZXN0YW50ZXMgfTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGpzb25SZXNwb25zZShyZXN1bHQsIDIwMCwgcmVxKTtcbiAgICB9XG5cbiAgICAvLyBHRVQgL2FwaS9jb3Vycy86c2x1ZyBvdSA6aWRcbiAgICBjb25zdCBjb3Vyc01hdGNoID0gcGF0aG5hbWUubWF0Y2goL15cXC9hcGlcXC9jb3Vyc1xcLyguKykkLyk7XG4gICAgaWYgKG1ldGhvZCA9PT0gXCJHRVRcIiAmJiBjb3Vyc01hdGNoKSB7XG4gICAgICBjb25zdCBzbHVnT3JJZCA9IGRlY29kZVVSSUNvbXBvbmVudChjb3Vyc01hdGNoWzFdKTtcbiAgICAgIGNvbnN0IGJ5SWQgPSAvXlxcZCskLy50ZXN0KHNsdWdPcklkKTtcbiAgICAgIGNvbnN0IHJvd3MgPSBieUlkXG4gICAgICAgID8gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBpZCA9ICR7cGFyc2VJbnQoc2x1Z09ySWQsIDEwKX1gXG4gICAgICAgIDogYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBzbHVnID0gJHtzbHVnT3JJZH1gO1xuICAgICAgY29uc3QgY291cnNlID0gKHJvd3MgJiYgcm93c1swXSkgfHwgbnVsbDtcbiAgICAgIGlmICghY291cnNlKSB7XG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQ291cnMgbm9uIHRyb3V2XHUwMEU5XCIsIDQwNCwgcmVxKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvdW50Um93cyA9IGF3YWl0IHNxbGBTRUxFQ1QgQ09VTlQoKik6OmludCBBUyBjbnQgRlJPTSBpbnNjcmlwdGlvbnMgV0hFUkUgY291cnNlX2lkID0gJHtjb3Vyc2UuaWR9YDtcbiAgICAgIGNvbnN0IGNvdW50ID0gKGNvdW50Um93cyAmJiBjb3VudFJvd3NbMF0gJiYgY291bnRSb3dzWzBdLmNudCkgfHwgMDtcbiAgICAgIGNvbnN0IHBsYWNlc19yZXN0YW50ZXMgPSBNYXRoLm1heCgwLCAoY291cnNlLnBsYWNlc19tYXggfHwgMCkgLSBjb3VudCk7XG4gICAgICBjb25zdCBvdXQgPSB7IC4uLmNvdXJzZSwgcGxhY2VzX3Jlc3RhbnRlcyB9O1xuICAgICAgcmV0dXJuIGpzb25SZXNwb25zZShvdXQsIDIwMCwgcmVxKTtcbiAgICB9XG5cbiAgICAvLyBQT1NUIC9hcGkvaW5zY3JpcHRpb25zXG4gICAgaWYgKG1ldGhvZCA9PT0gXCJQT1NUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9pbnNjcmlwdGlvbnNcIikge1xuICAgICAgbGV0IGJvZHk7XG4gICAgICB0cnkge1xuICAgICAgICBib2R5ID0gYXdhaXQgcmVxLmpzb24oKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkJvZHkgSlNPTiBpbnZhbGlkZVwiLCA0MDAsIHJlcSk7XG4gICAgICB9XG4gICAgICBjb25zdCB7XG4gICAgICAgIGNvdXJzZV9pZCxcbiAgICAgICAgY291cnM6IGNvdXJzTm9tLFxuICAgICAgICBub20sXG4gICAgICAgIGNvdXJyaWVsLFxuICAgICAgICB0ZWxlcGhvbmUsXG4gICAgICAgIHBhcnRpY2lwYW50czogcGFydGljaXBhbnRzSW5wdXQsXG4gICAgICAgIGVuZmFudCA9IG51bGwsXG4gICAgICAgIGpvdXJfcHJlZmVyZSA9IG51bGwsXG4gICAgICAgIGhvcmFpcmVfcHJlZmVyZSA9IG51bGwsXG4gICAgICAgIG1lc3NhZ2UgPSBudWxsLFxuICAgICAgICBuZXdzbGV0dGVyID0gZmFsc2UsXG4gICAgICAgIGVzdF9tZW1icmU6IGVzdE1lbWJyZUJvZHksXG4gICAgICB9ID0gYm9keTtcblxuICAgICAgbGV0IHBhcnRpY2lwYW50cyA9IFtdO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGFydGljaXBhbnRzSW5wdXQpICYmIHBhcnRpY2lwYW50c0lucHV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcGFydGljaXBhbnRzID0gcGFydGljaXBhbnRzSW5wdXRcbiAgICAgICAgICAubWFwKChwKSA9PiAoe1xuICAgICAgICAgICAgbm9tOiBTdHJpbmcoKHAgJiYgcC5ub20pIHx8IFwiXCIpLnRyaW0oKSxcbiAgICAgICAgICAgIGVuZmFudDpcbiAgICAgICAgICAgICAgcCAmJiBwLmVuZmFudCAhPSBudWxsICYmIFN0cmluZyhwLmVuZmFudCkudHJpbSgpXG4gICAgICAgICAgICAgICAgPyBTdHJpbmcocC5lbmZhbnQpLnRyaW0oKVxuICAgICAgICAgICAgICAgIDogbnVsbCxcbiAgICAgICAgICB9KSlcbiAgICAgICAgICAuZmlsdGVyKChwKSA9PiBwLm5vbSk7XG4gICAgICB9IGVsc2UgaWYgKG5vbSAmJiBTdHJpbmcobm9tKS50cmltKCkpIHtcbiAgICAgICAgcGFydGljaXBhbnRzID0gW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5vbTogU3RyaW5nKG5vbSkudHJpbSgpLFxuICAgICAgICAgICAgZW5mYW50OiBlbmZhbnQgIT0gbnVsbCAmJiBTdHJpbmcoZW5mYW50KS50cmltKCkgPyBTdHJpbmcoZW5mYW50KS50cmltKCkgOiBudWxsLFxuICAgICAgICAgIH0sXG4gICAgICAgIF07XG4gICAgICB9XG5cbiAgICAgIGlmICghY291cnJpZWwgfHwgIXRlbGVwaG9uZSB8fCBwYXJ0aWNpcGFudHMubGVuZ3RoIDwgMSkge1xuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcImNvdXJyaWVsLCB0ZWxlcGhvbmUgZXQgYXUgbW9pbnMgdW4gcGFydGljaXBhbnQgKG5vbSkgcmVxdWlzXCIsIDQwMCwgcmVxKTtcbiAgICAgIH1cbiAgICAgIGlmIChwYXJ0aWNpcGFudHMubGVuZ3RoID4gTUFYX0lOU0NSSVBUSU9OX1BBUlRJQ0lQQU5UUykge1xuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShgTWF4aW11bSAke01BWF9JTlNDUklQVElPTl9QQVJUSUNJUEFOVFN9IHBlcnNvbm5lcyBwYXIgZGVtYW5kZWAsIDQwMCwgcmVxKTtcbiAgICAgIH1cblxuICAgICAgbGV0IGNvdXJzZSA9IG51bGw7XG4gICAgICBpZiAoY291cnNlX2lkKSB7XG4gICAgICAgIGNvbnN0IHJvd3MgPSBhd2FpdCBzcWxgU0VMRUNUICogRlJPTSBjb3Vyc2VzIFdIRVJFIGlkID0gJHtjb3Vyc2VfaWR9YDtcbiAgICAgICAgY291cnNlID0gKHJvd3MgJiYgcm93c1swXSkgfHwgbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghY291cnNlICYmIGNvdXJzTm9tKSB7XG4gICAgICAgIGNvbnN0IHJvd3MgPSBhd2FpdCBzcWxgU0VMRUNUICogRlJPTSBjb3Vyc2VzIFdIRVJFIG5vbSA9ICR7Y291cnNOb219YDtcbiAgICAgICAgY291cnNlID0gKHJvd3MgJiYgcm93c1swXSkgfHwgbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghY291cnNlKSB7XG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQ291cnMgbm9uIHRyb3V2XHUwMEU5IChjb3Vyc2VfaWQgb3UgY291cnMgaW52YWxpZGUpXCIsIDQwMCwgcmVxKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY291bnRSb3dzID0gYXdhaXQgc3FsYFNFTEVDVCBDT1VOVCgqKTo6aW50IEFTIGNudCBGUk9NIGluc2NyaXB0aW9ucyBXSEVSRSBjb3Vyc2VfaWQgPSAke2NvdXJzZS5pZH1gO1xuICAgICAgY29uc3QgY291bnQgPSAoY291bnRSb3dzICYmIGNvdW50Um93c1swXSAmJiBjb3VudFJvd3NbMF0uY250KSB8fCAwO1xuICAgICAgaWYgKGNvdW50ICsgcGFydGljaXBhbnRzLmxlbmd0aCA+IChjb3Vyc2UucGxhY2VzX21heCB8fCAwKSkge1xuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcbiAgICAgICAgICBcIkNlIGNvdXJzIGVzdCBjb21wbGV0IG91IGlsIG5lIHJlc3RlIHBhcyBhc3NleiBkZSBwbGFjZXMgcG91ciBjZSBub21icmUgZGUgcGVyc29ubmVzLlwiLFxuICAgICAgICAgIDQwMCxcbiAgICAgICAgICByZXFcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZXN0TWVtYnJlQm9vbCA9XG4gICAgICAgIGVzdE1lbWJyZUJvZHkgPT09IHRydWUgfHwgZXN0TWVtYnJlQm9keSA9PT0gXCJvdWlcIiB8fCBlc3RNZW1icmVCb2R5ID09PSBcInRydWVcIjtcblxuICAgICAgZm9yIChjb25zdCBwIG9mIHBhcnRpY2lwYW50cykge1xuICAgICAgICBjb25zdCBlbmZhbnRWYWwgPSBwLmVuZmFudCB8fCBcIlwiO1xuICAgICAgICBjb25zdCBkdXBSb3dzID0gYXdhaXQgc3FsYFxuICAgICAgICAgIFNFTEVDVCBpZCwgY291cnNlX2lkLCBub20sIGNvdXJyaWVsLCB0ZWxlcGhvbmUsIGVuZmFudCwgam91cl9wcmVmZXJlLCBob3JhaXJlX3ByZWZlcmUsIG1lc3NhZ2UsIG5ld3NsZXR0ZXIsIGNyZWF0ZWRfYXRcbiAgICAgICAgICBGUk9NIGluc2NyaXB0aW9uc1xuICAgICAgICAgIFdIRVJFIGNvdXJzZV9pZCA9ICR7Y291cnNlLmlkfVxuICAgICAgICAgICAgQU5EIGxvd2VyKHRyaW0oY291cnJpZWwpKSA9IGxvd2VyKHRyaW0oJHtjb3VycmllbH0pKVxuICAgICAgICAgICAgQU5EIGxvd2VyKHRyaW0obm9tKSkgPSBsb3dlcih0cmltKCR7cC5ub219KSlcbiAgICAgICAgICAgIEFORCBjb2FsZXNjZSh0cmltKGVuZmFudCksICcnKSA9IGNvYWxlc2NlKHRyaW0oJHtlbmZhbnRWYWx9KSwgJycpXG4gICAgICAgICAgICBBTkQgY3JlYXRlZF9hdCA+IG5vdygpIC0gaW50ZXJ2YWwgJzE1IG1pbnV0ZXMnXG4gICAgICAgICAgTElNSVQgMVxuICAgICAgICBgO1xuICAgICAgICBpZiAoZHVwUm93cyAmJiBkdXBSb3dzWzBdKSB7XG4gICAgICAgICAgcmV0dXJuIGpzb25SZXNwb25zZSh7IC4uLmR1cFJvd3NbMF0sIGNvdXJzZV9ub206IGNvdXJzZS5ub20gfSwgMjAwLCByZXEpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG4gICAgICBjb25zdCBpbnNlcnRRdWVyaWVzID0gcGFydGljaXBhbnRzLm1hcCgocCwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgbXNnID0gaW5kZXggPT09IDAgPyBtZXNzYWdlIDogbnVsbDtcbiAgICAgICAgY29uc3QganAgPSBpbmRleCA9PT0gMCA/IGpvdXJfcHJlZmVyZSA6IG51bGw7XG4gICAgICAgIGNvbnN0IGhwID0gaW5kZXggPT09IDAgPyBob3JhaXJlX3ByZWZlcmUgOiBudWxsO1xuICAgICAgICByZXR1cm4gc3FsYFxuICAgICAgICAgIElOU0VSVCBJTlRPIGluc2NyaXB0aW9ucyAoY291cnNlX2lkLCBub20sIGNvdXJyaWVsLCB0ZWxlcGhvbmUsIGVuZmFudCwgam91cl9wcmVmZXJlLCBob3JhaXJlX3ByZWZlcmUsIG1lc3NhZ2UsIG5ld3NsZXR0ZXIsIGVzdF9tZW1icmUsIGNyZWF0ZWRfYXQpXG4gICAgICAgICAgVkFMVUVTICgke2NvdXJzZS5pZH0sICR7cC5ub219LCAke2NvdXJyaWVsfSwgJHt0ZWxlcGhvbmV9LCAke3AuZW5mYW50fSwgJHtqcH0sICR7aHB9LCAke21zZ30sICR7bmV3c2xldHRlcn0sICR7ZXN0TWVtYnJlQm9vbH0sICR7Y3JlYXRlZEF0fSlcbiAgICAgICAgICBSRVRVUk5JTkcgaWQsIGNvdXJzZV9pZCwgbm9tLCBjb3VycmllbCwgdGVsZXBob25lLCBlbmZhbnQsIGpvdXJfcHJlZmVyZSwgaG9yYWlyZV9wcmVmZXJlLCBtZXNzYWdlLCBuZXdzbGV0dGVyLCBlc3RfbWVtYnJlLCBjcmVhdGVkX2F0XG4gICAgICAgIGA7XG4gICAgICB9KTtcblxuICAgICAgbGV0IGluc2VydFJlc3VsdHM7XG4gICAgICBpZiAodHlwZW9mIHNxbC50cmFuc2FjdGlvbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGluc2VydFJlc3VsdHMgPSBhd2FpdCBzcWwudHJhbnNhY3Rpb24oaW5zZXJ0UXVlcmllcywgeyBpc29sYXRpb25MZXZlbDogXCJSZWFkQ29tbWl0dGVkXCIgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnNlcnRSZXN1bHRzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgcSBvZiBpbnNlcnRRdWVyaWVzKSB7XG4gICAgICAgICAgaW5zZXJ0UmVzdWx0cy5wdXNoKGF3YWl0IHEpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpcnN0Um93ID0gaW5zZXJ0UmVzdWx0c1swXSAmJiBpbnNlcnRSZXN1bHRzWzBdWzBdO1xuICAgICAgY29uc3QgaWRzID0gaW5zZXJ0UmVzdWx0cy5tYXAoKHIpID0+IHJbMF0uaWQpO1xuICAgICAgY29uc3QgY291cnNlTGFiZWwgPSBidWlsZENvdXJzZUxhYmVsKGNvdXJzZSk7XG4gICAgICBhd2FpdCBzZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb24oe1xuICAgICAgICB0bzogY291cnJpZWwsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZXM6IHBhcnRpY2lwYW50cy5tYXAoKHApID0+IHAubm9tKSxcbiAgICAgICAgY291cnNlTGFiZWwsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoXG4gICAgICAgIHtcbiAgICAgICAgICAuLi4oZmlyc3RSb3cgfHwge30pLFxuICAgICAgICAgIGluc2NyaXB0aW9uX2lkczogaWRzLFxuICAgICAgICAgIGNvdW50OiBpZHMubGVuZ3RoLFxuICAgICAgICAgIGNvdXJzZV9ub206IGNvdXJzZS5ub20sXG4gICAgICAgIH0sXG4gICAgICAgIDIwMSxcbiAgICAgICAgcmVxXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vID09PT09IEFETUlOIFJPVVRFUyA9PT09PVxuXG4gICAgLy8gUE9TVCAvYXBpL2FkbWluL2xvZ2luXG4gICAgaWYgKG1ldGhvZCA9PT0gXCJQT1NUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9sb2dpblwiKSB7XG4gICAgICBsZXQgYm9keTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQm9keSBKU09OIGludmFsaWRlXCIsIDQwMCwgcmVxKTtcbiAgICAgIH1cbiAgICAgIGlmIChib2R5LnBhc3N3b3JkICE9PSBBRE1JTl9QQVNTV09SRCkge1xuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIk1vdCBkZSBwYXNzZSBpbmNvcnJlY3RcIiwgNDAxLCByZXEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGpzb25SZXNwb25zZSh7IGFjY2Vzc190b2tlbjogY3JlYXRlVG9rZW4oKSwgdG9rZW5fdHlwZTogXCJiZWFyZXJcIiB9LCAyMDAsIHJlcSk7XG4gICAgfVxuXG4gICAgLy8gUHJvdGVjdGVkIGFkbWluIHJvdXRlc1xuICAgIGlmIChwYXRobmFtZS5zdGFydHNXaXRoKFwiL2FwaS9hZG1pbi9cIikpIHtcbiAgICAgIGlmICghdmVyaWZ5VG9rZW4ocmVxKSkge1xuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIk5vbiBhdXRvcmlzXHUwMEU5XCIsIDQwMSwgcmVxKTtcbiAgICAgIH1cblxuICAgICAgLy8gR0VUIC9hcGkvYWRtaW4vY291cnNlc1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJHRVRcIiAmJiBwYXRobmFtZSA9PT0gXCIvYXBpL2FkbWluL2NvdXJzZXNcIikge1xuICAgICAgICBjb25zdCBjb3Vyc2VzID0gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBPUkRFUiBCWSBkaXNjaXBsaW5lLCBub21gO1xuICAgICAgICBjb25zdCBjb3VudHMgPSBhd2FpdCBzcWxgXG4gICAgICAgICAgU0VMRUNUIGNvdXJzZV9pZCwgQ09VTlQoKik6OmludCBBUyBjbnRcbiAgICAgICAgICBGUk9NIGluc2NyaXB0aW9uc1xuICAgICAgICAgIEdST1VQIEJZIGNvdXJzZV9pZFxuICAgICAgICBgO1xuICAgICAgICBjb25zdCBjb3VudEJ5Q291cnNlID0gT2JqZWN0LmZyb21FbnRyaWVzKChjb3VudHMgfHwgW10pLm1hcCgocikgPT4gW3IuY291cnNlX2lkLCByLmNudF0pKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gKGNvdXJzZXMgfHwgW10pLm1hcCgoYykgPT4ge1xuICAgICAgICAgIGNvbnN0IGNvdW50ID0gY291bnRCeUNvdXJzZVtjLmlkXSB8fCAwO1xuICAgICAgICAgIGNvbnN0IHBsYWNlc19yZXN0YW50ZXMgPSBNYXRoLm1heCgwLCAoYy5wbGFjZXNfbWF4IHx8IDApIC0gY291bnQpO1xuICAgICAgICAgIHJldHVybiB7IC4uLmMsIHBsYWNlc19yZXN0YW50ZXMgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UocmVzdWx0LCAyMDAsIHJlcSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFBVVCAvYXBpL2FkbWluL2NvdXJzZXMvOmlkIFx1MjAxNCBtaXNlIFx1MDBFMCBqb3VyIHBhcnRpZWxsZSAoZXguIHBsYWNlc19tYXgpXG4gICAgICBjb25zdCBhZG1pbkNvdXJzZVB1dCA9IHBhdGhuYW1lLm1hdGNoKC9eXFwvYXBpXFwvYWRtaW5cXC9jb3Vyc2VzXFwvKFxcZCspJC8pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJQVVRcIiAmJiBhZG1pbkNvdXJzZVB1dCkge1xuICAgICAgICBjb25zdCBjb3Vyc2VJZCA9IHBhcnNlSW50KGFkbWluQ291cnNlUHV0WzFdLCAxMCk7XG4gICAgICAgIGxldCBib2R5O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkJvZHkgSlNPTiBpbnZhbGlkZVwiLCA0MDAsIHJlcSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBzcWxgU0VMRUNUIGlkIEZST00gY291cnNlcyBXSEVSRSBpZCA9ICR7Y291cnNlSWR9YDtcbiAgICAgICAgaWYgKCFleGlzdGluZyB8fCAhZXhpc3RpbmdbMF0pIHtcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkNvdXJzIG5vbiB0cm91dlx1MDBFOVwiLCA0MDQsIHJlcSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcG0gPSBib2R5LnBsYWNlc19tYXg7XG4gICAgICAgIGNvbnN0IHBsYWNlc01heCA9XG4gICAgICAgICAgdHlwZW9mIHBtID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZShwbSkgPyBNYXRoLnRydW5jKHBtKSA6IHBhcnNlSW50KFN0cmluZyhwbSA/PyBcIlwiKSwgMTApO1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHBsYWNlc01heCkgfHwgcGxhY2VzTWF4IDwgMCkge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwicGxhY2VzX21heCByZXF1aXMgKGVudGllciBcdTIyNjUgMClcIiwgNDAwLCByZXEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVwZGF0ZWQgPSBhd2FpdCBzcWxgXG4gICAgICAgICAgVVBEQVRFIGNvdXJzZXMgU0VUIHBsYWNlc19tYXggPSAke3BsYWNlc01heH0gV0hFUkUgaWQgPSAke2NvdXJzZUlkfSBSRVRVUk5JTkcgKlxuICAgICAgICBgO1xuICAgICAgICBjb25zdCBjID0gdXBkYXRlZFswXTtcbiAgICAgICAgY29uc3QgY291bnRSb3dzID0gYXdhaXQgc3FsYFNFTEVDVCBDT1VOVCgqKTo6aW50IEFTIGNudCBGUk9NIGluc2NyaXB0aW9ucyBXSEVSRSBjb3Vyc2VfaWQgPSAke2NvdXJzZUlkfWA7XG4gICAgICAgIGNvbnN0IGNvdW50ID0gKGNvdW50Um93cyAmJiBjb3VudFJvd3NbMF0gJiYgY291bnRSb3dzWzBdLmNudCkgfHwgMDtcbiAgICAgICAgY29uc3QgcGxhY2VzX3Jlc3RhbnRlcyA9IE1hdGgubWF4KDAsIChjLnBsYWNlc19tYXggfHwgMCkgLSBjb3VudCk7XG4gICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoeyAuLi5jLCBwbGFjZXNfcmVzdGFudGVzIH0sIDIwMCwgcmVxKTtcbiAgICAgIH1cblxuICAgICAgLy8gR0VUIC9hcGkvYWRtaW4vaW5zY3JpcHRpb25zXG4gICAgICBpZiAobWV0aG9kID09PSBcIkdFVFwiICYmIHBhdGhuYW1lID09PSBcIi9hcGkvYWRtaW4vaW5zY3JpcHRpb25zXCIpIHtcbiAgICAgICAgY29uc3QgY291cnNlSWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImNvdXJzZV9pZFwiKTtcbiAgICAgICAgbGV0IGluc2NyaXB0aW9ucztcbiAgICAgICAgaWYgKGNvdXJzZUlkKSB7XG4gICAgICAgICAgaW5zY3JpcHRpb25zID0gYXdhaXQgc3FsYFxuICAgICAgICAgICAgU0VMRUNUIGkuKiwgYy5ub20gYXMgY291cnNlX25vbSwgYy5kYXRlX2RlYnV0IGFzIGNvdXJzZV9kYXRlXG4gICAgICAgICAgICBGUk9NIGluc2NyaXB0aW9ucyBpIFxuICAgICAgICAgICAgSk9JTiBjb3Vyc2VzIGMgT04gaS5jb3Vyc2VfaWQgPSBjLmlkIFxuICAgICAgICAgICAgV0hFUkUgaS5jb3Vyc2VfaWQgPSAke3BhcnNlSW50KGNvdXJzZUlkLCAxMCl9XG4gICAgICAgICAgICBPUkRFUiBCWSBpLmNyZWF0ZWRfYXQgREVTQ1xuICAgICAgICAgIGA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaW5zY3JpcHRpb25zID0gYXdhaXQgc3FsYFxuICAgICAgICAgICAgU0VMRUNUIGkuKiwgYy5ub20gYXMgY291cnNlX25vbSwgYy5kYXRlX2RlYnV0IGFzIGNvdXJzZV9kYXRlXG4gICAgICAgICAgICBGUk9NIGluc2NyaXB0aW9ucyBpIFxuICAgICAgICAgICAgSk9JTiBjb3Vyc2VzIGMgT04gaS5jb3Vyc2VfaWQgPSBjLmlkIFxuICAgICAgICAgICAgT1JERVIgQlkgaS5jcmVhdGVkX2F0IERFU0NcbiAgICAgICAgICBgO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoaW5zY3JpcHRpb25zIHx8IFtdLCAyMDAsIHJlcSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEdFVCAvYXBpL2FkbWluL2luc2NyaXB0aW9ucy9leHBvcnRcbiAgICAgIGlmIChtZXRob2QgPT09IFwiR0VUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9pbnNjcmlwdGlvbnMvZXhwb3J0XCIpIHtcbiAgICAgICAgY29uc3QgY291cnNlSWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImNvdXJzZV9pZFwiKTtcbiAgICAgICAgbGV0IGluc2NyaXB0aW9ucztcbiAgICAgICAgaWYgKGNvdXJzZUlkKSB7XG4gICAgICAgICAgaW5zY3JpcHRpb25zID0gYXdhaXQgc3FsYFxuICAgICAgICAgICAgU0VMRUNUIGkuKiwgYy5ub20gYXMgY291cnNlX25vbSwgYy5kYXRlX2RlYnV0IGFzIGNvdXJzZV9kYXRlXG4gICAgICAgICAgICBGUk9NIGluc2NyaXB0aW9ucyBpIFxuICAgICAgICAgICAgSk9JTiBjb3Vyc2VzIGMgT04gaS5jb3Vyc2VfaWQgPSBjLmlkIFxuICAgICAgICAgICAgV0hFUkUgaS5jb3Vyc2VfaWQgPSAke3BhcnNlSW50KGNvdXJzZUlkLCAxMCl9XG4gICAgICAgICAgICBPUkRFUiBCWSBpLmNyZWF0ZWRfYXQgREVTQ1xuICAgICAgICAgIGA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaW5zY3JpcHRpb25zID0gYXdhaXQgc3FsYFxuICAgICAgICAgICAgU0VMRUNUIGkuKiwgYy5ub20gYXMgY291cnNlX25vbSwgYy5kYXRlX2RlYnV0IGFzIGNvdXJzZV9kYXRlXG4gICAgICAgICAgICBGUk9NIGluc2NyaXB0aW9ucyBpIFxuICAgICAgICAgICAgSk9JTiBjb3Vyc2VzIGMgT04gaS5jb3Vyc2VfaWQgPSBjLmlkIFxuICAgICAgICAgICAgT1JERVIgQlkgaS5jcmVhdGVkX2F0IERFU0NcbiAgICAgICAgICBgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBDU1ZcbiAgICAgICAgY29uc3Qgcm93cyA9IFtbXCJpZFwiLCBcImRhdGVfaW5zY3JpcHRpb25cIiwgXCJjb3Vyc1wiLCBcImRhdGVfY291cnNcIiwgXCJub21cIiwgXCJjb3VycmllbFwiLCBcInRlbGVwaG9uZVwiLCBcImVuZmFudFwiLCBcIm1lc3NhZ2VcIiwgXCJuZXdzbGV0dGVyXCIsIFwiZXN0X21lbWJyZVwiXV07XG4gICAgICAgIGZvciAoY29uc3QgaSBvZiAoaW5zY3JpcHRpb25zIHx8IFtdKSkge1xuICAgICAgICAgIHJvd3MucHVzaChbXG4gICAgICAgICAgICBpLmlkLFxuICAgICAgICAgICAgaS5jcmVhdGVkX2F0ID8gbmV3IERhdGUoaS5jcmVhdGVkX2F0KS50b0lTT1N0cmluZygpIDogXCJcIixcbiAgICAgICAgICAgIGkuY291cnNlX25vbSB8fCBcIlwiLFxuICAgICAgICAgICAgaS5jb3Vyc2VfZGF0ZSB8fCBcIlwiLFxuICAgICAgICAgICAgaS5ub20gfHwgXCJcIixcbiAgICAgICAgICAgIGkuY291cnJpZWwgfHwgXCJcIixcbiAgICAgICAgICAgIGkudGVsZXBob25lIHx8IFwiXCIsXG4gICAgICAgICAgICBpLmVuZmFudCB8fCBcIlwiLFxuICAgICAgICAgICAgKGkubWVzc2FnZSB8fCBcIlwiKS5yZXBsYWNlKC9cXG4vZywgXCIgXCIpLFxuICAgICAgICAgICAgaS5uZXdzbGV0dGVyID8gXCJvdWlcIiA6IFwibm9uXCIsXG4gICAgICAgICAgICBpLmVzdF9tZW1icmUgPyBcIm91aVwiIDogXCJub25cIixcbiAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjc3YgPSByb3dzLm1hcChyID0+IHIubWFwKGMgPT4gYFwiJHtTdHJpbmcoYykucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImApLmpvaW4oXCIsXCIpKS5qb2luKFwiXFxuXCIpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShjc3YsIHtcbiAgICAgICAgICBzdGF0dXM6IDIwMCxcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvY3N2OyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgICBcIkNvbnRlbnQtRGlzcG9zaXRpb25cIjogXCJhdHRhY2htZW50OyBmaWxlbmFtZT1pbnNjcmlwdGlvbnMuY3N2XCIsXG4gICAgICAgICAgICAuLi5jb3JzSGVhZGVycyhyZXEpLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiTm90IEZvdW5kXCIsIDQwNCwgcmVxKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkFQSSBlcnJvcjpcIiwgZXJyKTtcbiAgICByZXR1cm4ganNvblJlc3BvbnNlKHsgZGV0YWlsOiBlcnIubWVzc2FnZSB8fCBcIkVycmV1ciBzZXJ2ZXVyXCIgfSwgNTAwLCByZXEpO1xuICB9XG59O1xuIiwgIi8qKlxuICogQ291cnJpZWwgdHJhbnNhY3Rpb25uZWwgZGUgY29uZmlybWF0aW9uIGQnaW5zY3JpcHRpb24gKEFQSSBSZXNlbmQpLlxuICogTmUgbGFuY2UgcGFzIGQnZXJyZXVyIDogam91cm5hbGlzZSBldCByZXRvdXJuZSB7IHNlbnQ6IGJvb2xlYW4sIC4uLiB9LlxuICovXG5cbmNvbnN0IFJFU0VORF9VUkwgPSBcImh0dHBzOi8vYXBpLnJlc2VuZC5jb20vZW1haWxzXCI7XG5cbmZ1bmN0aW9uIGVzY2FwZUh0bWwocykge1xuICByZXR1cm4gU3RyaW5nKHMpXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgIC5yZXBsYWNlKC88L2csIFwiJmx0O1wiKVxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKVxuICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKTtcbn1cblxuLyoqIExpYmVsbFx1MDBFOSBsaXNpYmxlIGR1IGNvdXJzIChhbGlnblx1MDBFOSBzdXIgbGUgc1x1MDBFOWxlY3RldXIgZHUgc2l0ZSkuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb3Vyc2VMYWJlbChjb3Vyc2UpIHtcbiAgaWYgKCFjb3Vyc2UpIHJldHVybiBcIk5vbiBwclx1MDBFOWNpc1x1MDBFOVwiO1xuICBjb25zdCBwYXJ0cyA9IFtjb3Vyc2Uubm9tIHx8IFwiXCJdLmZpbHRlcihCb29sZWFuKTtcbiAgY29uc3QgZGV0YWlscyA9IFtdO1xuICBpZiAoY291cnNlLmRhdGVfZGVidXQpIGRldGFpbHMucHVzaChjb3Vyc2UuZGF0ZV9kZWJ1dCk7XG4gIGlmIChjb3Vyc2Uuam91cikgZGV0YWlscy5wdXNoKGNvdXJzZS5qb3VyKTtcbiAgaWYgKGNvdXJzZS5oZXVyZSkgZGV0YWlscy5wdXNoKGNvdXJzZS5oZXVyZSk7XG4gIGlmIChkZXRhaWxzLmxlbmd0aCkgcGFydHMucHVzaChcIihcIiArIGRldGFpbHMuam9pbihcIiAtIFwiKSArIFwiKVwiKTtcbiAgY29uc3Qgb3V0ID0gcGFydHMuam9pbihcIiBcIikudHJpbSgpO1xuICByZXR1cm4gb3V0IHx8IFwiVm90cmUgY291cnNcIjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge3sgdG86IHN0cmluZywgY291cnNlTGFiZWw6IHN0cmluZywgcGFydGljaXBhbnROYW1lcz86IHN0cmluZ1tdLCBub20/OiBzdHJpbmcgfX0gb3B0c1xuICogQHJldHVybnMge1Byb21pc2U8eyBzZW50OiBib29sZWFuLCByZWFzb24/OiBzdHJpbmcsIGlkPzogc3RyaW5nIH0+fVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uKHsgdG8sIGNvdXJzZUxhYmVsLCBwYXJ0aWNpcGFudE5hbWVzLCBub20gfSkge1xuICBjb25zdCBhcGlLZXkgPSBwcm9jZXNzLmVudi5SRVNFTkRfQVBJX0tFWTtcbiAgY29uc3QgZnJvbSA9IHByb2Nlc3MuZW52LkNPTkZJUk1BVElPTl9FTUFJTF9GUk9NO1xuICBpZiAoIWFwaUtleSB8fCAhZnJvbSkge1xuICAgIGNvbnNvbGUud2FybihcbiAgICAgIFwiW3NlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbl0gUkVTRU5EX0FQSV9LRVkgb3UgQ09ORklSTUFUSU9OX0VNQUlMX0ZST00gbWFucXVhbnQgXHUyMDE0IGNvdXJyaWVsIG5vbiBlbnZveVx1MDBFOVwiXG4gICAgKTtcbiAgICByZXR1cm4geyBzZW50OiBmYWxzZSwgcmVhc29uOiBcIm5vdF9jb25maWd1cmVkXCIgfTtcbiAgfVxuICBjb25zdCBhZGRyID0gKHRvIHx8IFwiXCIpLnRyaW0oKTtcbiAgaWYgKCFhZGRyIHx8ICFhZGRyLmluY2x1ZGVzKFwiQFwiKSkge1xuICAgIGNvbnNvbGUud2FybihcIltzZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb25dIGNvdXJyaWVsIGRlc3RpbmF0YWlyZSBpbnZhbGlkZVwiKTtcbiAgICByZXR1cm4geyBzZW50OiBmYWxzZSwgcmVhc29uOiBcImludmFsaWRfdG9cIiB9O1xuICB9XG5cbiAgbGV0IG5hbWVzID0gQXJyYXkuaXNBcnJheShwYXJ0aWNpcGFudE5hbWVzKVxuICAgID8gcGFydGljaXBhbnROYW1lcy5tYXAoKG4pID0+IFN0cmluZyhuIHx8IFwiXCIpLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pXG4gICAgOiBbXTtcbiAgaWYgKG5hbWVzLmxlbmd0aCA9PT0gMCAmJiBub20pIHtcbiAgICBjb25zdCBvbmUgPSBTdHJpbmcobm9tKS50cmltKCk7XG4gICAgaWYgKG9uZSkgbmFtZXMgPSBbb25lXTtcbiAgfVxuICBpZiAobmFtZXMubGVuZ3RoID09PSAwKSBuYW1lcyA9IFtcIlwiXTtcblxuICBjb25zdCBwcmVub20gPSAobmFtZXNbMF0gfHwgXCJcIikuc3BsaXQoL1xccysvKVswXSB8fCBcIkJvbmpvdXJcIjtcbiAgY29uc3QgbGFiZWwgPSBjb3Vyc2VMYWJlbCB8fCBcInZvdHJlIGNvdXJzXCI7XG4gIGNvbnN0IHBsdXNpZXVycyA9IG5hbWVzLmxlbmd0aCA+IDE7XG4gIGNvbnN0IGxpc3RlVGV4dGUgPSBuYW1lcy5maWx0ZXIoQm9vbGVhbikuam9pbihcIiwgXCIpO1xuICBjb25zdCBsaXN0ZUh0bWwgPSBuYW1lc1xuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChuKSA9PiBgPGxpPiR7ZXNjYXBlSHRtbChuKX08L2xpPmApXG4gICAgLmpvaW4oXCJcIik7XG5cbiAgY29uc3Qgc3ViamVjdCA9IFwiVm90cmUgZGVtYW5kZSBkJ2luc2NyaXB0aW9uIFx1MjAxNCBBdGVsaWVycyBTdC1FbG1lXCI7XG5cbiAgY29uc3QgY29ycHNMaXN0ZVRleHRlID0gcGx1c2lldXJzXG4gICAgPyBgUGVyc29ubmVzIGluc2NyaXRlcyA6XFxuJHtuYW1lcy5maWx0ZXIoQm9vbGVhbikubWFwKChuKSA9PiBcIlx1MjAyMiBcIiArIG4pLmpvaW4oXCJcXG5cIil9XFxuXFxuYFxuICAgIDogXCJcIjtcblxuICBjb25zdCBjb3Jwc0xpc3RlSHRtbCA9IHBsdXNpZXVyc1xuICAgID8gYDxwPlBlcnNvbm5lcyBpbnNjcml0ZXMmbmJzcDs6PC9wPjx1bD4ke2xpc3RlSHRtbH08L3VsPmBcbiAgICA6IGA8cD48c3Ryb25nPiR7ZXNjYXBlSHRtbChuYW1lc1swXSB8fCBcIlBhcnRpY2lwYW50XCIpfTwvc3Ryb25nPjwvcD5gO1xuXG4gIGNvbnN0IHBocmFzZVBsYWNlcyA9IHBsdXNpZXVyc1xuICAgID8gXCJOb3VzIGF2b25zIGJpZW4gcmVcdTAwRTd1IHZvdHJlIGRlbWFuZGUgZCdpbnNjcmlwdGlvbiBwb3VyIHBsdXNpZXVycyBwZXJzb25uZXMuXCJcbiAgICA6IFwiTm91cyBhdm9ucyBiaWVuIHJlXHUwMEU3dSB2b3RyZSBkZW1hbmRlIGQnaW5zY3JpcHRpb24uXCI7XG5cbiAgY29uc3QgdGV4dCA9IGBCb25qb3VyICR7cHJlbm9tfSxcblxuJHtwaHJhc2VQbGFjZXN9XG5Db3VycyA6ICR7bGFiZWx9LlxuXG4ke2NvcnBzTGlzdGVUZXh0ZX1Wb3RyZSBkZW1hbmRlIGEgXHUwMEU5dFx1MDBFOSBlbnZveVx1MDBFOWUgYXZlYyBzdWNjXHUwMEU4cy4gTm91cyB2b3VzIGNvbnRhY3Rlcm9ucyBkYW5zIGxlcyBwcm9jaGFpbnMgam91cnMgcG91ciBjb25maXJtZXIgJHtwbHVzaWV1cnMgPyBcImxlcyBwbGFjZXNcIiA6IFwidm90cmUgcGxhY2VcIn0gZXQgdm91cyB0cmFuc21ldHRyZSBsZXMgaW5mb3JtYXRpb25zIGRlIHBhaWVtZW50LlxuXG5cdTIwMTQgTCdcdTAwRTlxdWlwZSBkZXMgQXRlbGllcnMgU3QtRWxtZVxuaHR0cHM6Ly9hdGVsaWVyc3RlbG1lLmNhXG5Qb3VyIHRvdXRlIHF1ZXN0aW9uIDogaW5mb0BhdGVsaWVyc3RlbG1lLmNhYDtcblxuICBjb25zdCBodG1sID0gYDxwPkJvbmpvdXIgJHtlc2NhcGVIdG1sKHByZW5vbSl9LDwvcD5cbjxwPiR7cGhyYXNlUGxhY2VzfSBDb3VycyZuYnNwOzogPHN0cm9uZz4ke2VzY2FwZUh0bWwobGFiZWwpfTwvc3Ryb25nPi48L3A+XG4ke2NvcnBzTGlzdGVIdG1sfVxuPHA+Vm90cmUgZGVtYW5kZSBhIFx1MDBFOXRcdTAwRTkgZW52b3lcdTAwRTllIGF2ZWMgc3VjY1x1MDBFOHMuIE5vdXMgdm91cyBjb250YWN0ZXJvbnMgZGFucyBsZXMgcHJvY2hhaW5zIGpvdXJzIHBvdXIgY29uZmlybWVyICR7cGx1c2lldXJzID8gXCJsZXMgcGxhY2VzXCIgOiBcInZvdHJlIHBsYWNlXCJ9IGV0IHZvdXMgdHJhbnNtZXR0cmUgbGVzIGluZm9ybWF0aW9ucyBkZSBwYWllbWVudC48L3A+XG48cD5cdTIwMTQgTCdcdTAwRTlxdWlwZSBkZXMgQXRlbGllcnMgU3QtRWxtZTwvcD5cbjxwPjxhIGhyZWY9XCJodHRwczovL2F0ZWxpZXJzdGVsbWUuY2FcIj5hdGVsaWVyc3RlbG1lLmNhPC9hPiBcdTIwMTQgPGEgaHJlZj1cIm1haWx0bzppbmZvQGF0ZWxpZXJzdGVsbWUuY2FcIj5pbmZvQGF0ZWxpZXJzdGVsbWUuY2E8L2E+PC9wPmA7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChSRVNFTkRfVVJMLCB7XG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YXBpS2V5fWAsXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgZnJvbSxcbiAgICAgICAgdG86IFthZGRyXSxcbiAgICAgICAgc3ViamVjdCxcbiAgICAgICAgdGV4dCxcbiAgICAgICAgaHRtbCxcbiAgICAgIH0pLFxuICAgIH0pO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXMuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpO1xuICAgIGlmICghcmVzLm9rKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiW3NlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbl0gUmVzZW5kIGVycm9yOlwiLCByZXMuc3RhdHVzLCBkYXRhKTtcbiAgICAgIHJldHVybiB7IHNlbnQ6IGZhbHNlLCByZWFzb246IFwiYXBpX2Vycm9yXCIsIHN0YXR1czogcmVzLnN0YXR1cywgZGF0YSB9O1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIltzZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb25dIGVudm95XHUwMEU5IFx1MDBFMFwiLCBhZGRyLCBsaXN0ZVRleHRlIHx8IHByZW5vbSk7XG4gICAgcmV0dXJuIHsgc2VudDogdHJ1ZSwgaWQ6IGRhdGEuaWQgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJbc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uXSBmZXRjaCBlcnJvcjpcIiwgZSk7XG4gICAgcmV0dXJuIHsgc2VudDogZmFsc2UsIHJlYXNvbjogXCJmZXRjaF9lcnJvclwiLCBlcnJvcjogZS5tZXNzYWdlIH07XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFRQSxTQUFTLFlBQVk7QUFDckIsT0FBTyxTQUFTOzs7QUNKaEIsSUFBTSxhQUFhO0FBRW5CLFNBQVMsV0FBVyxHQUFHO0FBQ3JCLFNBQU8sT0FBTyxDQUFDLEVBQ1osUUFBUSxNQUFNLE9BQU8sRUFDckIsUUFBUSxNQUFNLE1BQU0sRUFDcEIsUUFBUSxNQUFNLE1BQU0sRUFDcEIsUUFBUSxNQUFNLFFBQVE7QUFDM0I7QUFHTyxTQUFTLGlCQUFpQixRQUFRO0FBQ3ZDLE1BQUksQ0FBQyxPQUFRLFFBQU87QUFDcEIsUUFBTSxRQUFRLENBQUMsT0FBTyxPQUFPLEVBQUUsRUFBRSxPQUFPLE9BQU87QUFDL0MsUUFBTSxVQUFVLENBQUM7QUFDakIsTUFBSSxPQUFPLFdBQVksU0FBUSxLQUFLLE9BQU8sVUFBVTtBQUNyRCxNQUFJLE9BQU8s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
