
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
        const rows = await sql`SELECT * FROM courses WHERE id = ${courseId} LIMIT 1`;
        if (!rows || !rows[0]) {
          return errorResponse("Cours non trouv\xE9", 404, req);
        }
        const cur = rows[0];
        const hasPlaces = body.places_max !== void 0 && body.places_max !== null && String(body.places_max).trim() !== "";
        const hasActif = typeof body.actif === "boolean";
        if (!hasPlaces && !hasActif) {
          return errorResponse("Fournir places_max et/ou actif (bool\xE9en)", 400, req);
        }
        let nextPlaces = cur.places_max ?? 0;
        if (hasPlaces) {
          const pm = body.places_max;
          const n = typeof pm === "number" && Number.isFinite(pm) ? Math.trunc(pm) : parseInt(String(pm), 10);
          if (Number.isNaN(n) || n < 0) {
            return errorResponse("places_max invalide (entier \u2265 0)", 400, req);
          }
          nextPlaces = n;
        }
        let nextActif = !!cur.actif;
        if (hasActif) {
          nextActif = body.actif;
        }
        const updated = await sql`
          UPDATE courses SET places_max = ${nextPlaces}, actif = ${nextActif} WHERE id = ${courseId} RETURNING *
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvYXBpLm1qcyIsICJuZXRsaWZ5L2Z1bmN0aW9ucy9saWIvc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uLm1qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXHJcbiAqIE5ldGxpZnkgRnVuY3Rpb246IEFQSSBjb3VycyArIGluc2NyaXB0aW9ucyArIGFkbWluIChOZW9uIERCKVxyXG4gKiBSXHUwMEU5cGxpcXVlIGxlIGNvbXBvcnRlbWVudCBkdSBiYWNrZW5kIEZhc3RBUEkgcG91ciBsZSBmcm9udCB2YW5pbGxhLlxyXG4gKiBSb3V0ZXM6IFxyXG4gKiAgIEdFVCAvYXBpL2NvdXJzLCBHRVQgL2FwaS9jb3Vycy86c2x1ZywgUE9TVCAvYXBpL2luc2NyaXB0aW9uc1xyXG4gKiAgIFBPU1QgL2FwaS9hZG1pbi9sb2dpbiwgR0VUIC9hcGkvYWRtaW4vY291cnNlcywgUFVUIC9hcGkvYWRtaW4vY291cnNlcy86aWRcclxuICogICBHRVQgL2FwaS9hZG1pbi9pbnNjcmlwdGlvbnMsIEdFVCAvYXBpL2FkbWluL2luc2NyaXB0aW9ucy9leHBvcnRcclxuICovXHJcbmltcG9ydCB7IG5lb24gfSBmcm9tIFwiQG5lb25kYXRhYmFzZS9zZXJ2ZXJsZXNzXCI7XHJcbmltcG9ydCBqd3QgZnJvbSBcImpzb253ZWJ0b2tlblwiO1xyXG5pbXBvcnQge1xyXG4gIHNlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbixcclxuICBidWlsZENvdXJzZUxhYmVsLFxyXG59IGZyb20gXCIuL2xpYi9zZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb24ubWpzXCI7XHJcblxyXG5jb25zdCBTRUNSRVRfS0VZID0gcHJvY2Vzcy5lbnYuU0VDUkVUX0tFWSB8fCBcImNoYW5nZS1tZS1pbi1wcm9kdWN0aW9uXCI7XHJcbmNvbnN0IEFETUlOX1BBU1NXT1JEID0gcHJvY2Vzcy5lbnYuQURNSU5fUEFTU1dPUkQgfHwgXCJhZG1pblwiO1xyXG5jb25zdCBNQVhfSU5TQ1JJUFRJT05fUEFSVElDSVBBTlRTID0gODtcclxuXHJcbmZ1bmN0aW9uIGNvcnNIZWFkZXJzKHJlcSkge1xyXG4gIGNvbnN0IG9yaWdpbiA9IHJlcS5oZWFkZXJzLmdldChcIm9yaWdpblwiKTtcclxuICBjb25zdCBvayA9IG9yaWdpbiAmJiAob3JpZ2luLnN0YXJ0c1dpdGgoXCJodHRwOi8vbG9jYWxob3N0XCIpIHx8IG9yaWdpbi5zdGFydHNXaXRoKFwiaHR0cDovLzEyNy4wLjAuMVwiKSB8fCBvcmlnaW4uaW5jbHVkZXMoXCJuZXRsaWZ5XCIpIHx8IG9yaWdpbi5pbmNsdWRlcyhcImF0ZWxpZXJzdGVsbWVcIikpO1xyXG4gIGlmICghb2spIHJldHVybiB7fTtcclxuICByZXR1cm4ge1xyXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogb3JpZ2luLFxyXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiR0VULCBQT1NULCBQVVQsIERFTEVURSwgT1BUSU9OU1wiLFxyXG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uXCIsXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVG9rZW4oKSB7XHJcbiAgcmV0dXJuIGp3dC5zaWduKHsgYWRtaW46IHRydWUgfSwgU0VDUkVUX0tFWSwgeyBleHBpcmVzSW46IFwiMjRoXCIgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZlcmlmeVRva2VuKHJlcSkge1xyXG4gIGNvbnN0IGF1dGggPSByZXEuaGVhZGVycy5nZXQoXCJhdXRob3JpemF0aW9uXCIpO1xyXG4gIGlmICghYXV0aCB8fCAhYXV0aC5zdGFydHNXaXRoKFwiQmVhcmVyIFwiKSkgcmV0dXJuIGZhbHNlO1xyXG4gIGNvbnN0IHRva2VuID0gYXV0aC5zbGljZSg3KTtcclxuICB0cnkge1xyXG4gICAgand0LnZlcmlmeSh0b2tlbiwgU0VDUkVUX0tFWSk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9IGNhdGNoIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGpzb25SZXNwb25zZShkYXRhLCBzdGF0dXMgPSAyMDAsIHJlcSA9IG51bGwpIHtcclxuICBjb25zdCBoZWFkZXJzID0ge1xyXG4gICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcbiAgICAvLyBMZXMgcGxhY2VzIHJlc3RhbnRlcyBjaGFuZ2VudCBcdTAwRTAgY2hhcXVlIGluc2NyaXB0aW9uIDogbmUgcGFzIG1ldHRyZSBlbiBjYWNoZSAobmF2aWdhdGV1ciAvIENETilcclxuICAgIFwiQ2FjaGUtQ29udHJvbFwiOiBcInByaXZhdGUsIG5vLXN0b3JlLCBuby1jYWNoZSwgbXVzdC1yZXZhbGlkYXRlXCIsXHJcbiAgICAuLi4ocmVxID8gY29yc0hlYWRlcnMocmVxKSA6IHt9KSxcclxuICB9O1xyXG4gIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSksIHsgc3RhdHVzLCBoZWFkZXJzIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKG1lc3NhZ2UsIHN0YXR1cyA9IDQwMCwgcmVxID0gbnVsbCkge1xyXG4gIHJldHVybiBqc29uUmVzcG9uc2UoeyBkZXRhaWw6IG1lc3NhZ2UgfSwgc3RhdHVzLCByZXEpO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhc3luYyAocmVxLCBjb250ZXh0KSA9PiB7XHJcbiAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsKTtcclxuICAvLyBOZXRsaWZ5IHJld3JpdGUgZW52b2llIC8ubmV0bGlmeS9mdW5jdGlvbnMvYXBpLzpzcGxhdCBcdTIxOTIgbm9ybWFsaXNlciBlbiAvYXBpLy4uLlxyXG4gIGxldCBwYXRobmFtZSA9IHVybC5wYXRobmFtZTtcclxuICBpZiAocGF0aG5hbWUuc3RhcnRzV2l0aChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvYXBpXCIpKSB7XHJcbiAgICBwYXRobmFtZSA9IFwiL2FwaVwiICsgcGF0aG5hbWUuc2xpY2UoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2FwaVwiLmxlbmd0aCkgfHwgXCIvYXBpXCI7XHJcbiAgfVxyXG4gIGNvbnN0IG1ldGhvZCA9IHJlcS5tZXRob2Q7XHJcblxyXG4gIGlmIChtZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XHJcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHsgc3RhdHVzOiAyMDQsIGhlYWRlcnM6IHsgLi4uY29yc0hlYWRlcnMocmVxKSwgXCJBY2Nlc3MtQ29udHJvbC1NYXgtQWdlXCI6IFwiODY0MDBcIiB9IH0pO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZGF0YWJhc2VVcmwgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwgfHwgcHJvY2Vzcy5lbnYuTkVUTElGWV9EQVRBQkFTRV9VUkwgfHwgcHJvY2Vzcy5lbnYuTkVUTElGWV9EQVRBQkFTRV9VUkxfVU5QT09MRUQ7XHJcbiAgaWYgKCFkYXRhYmFzZVVybCkge1xyXG4gICAgcmV0dXJuIGpzb25SZXNwb25zZSh7IGRldGFpbDogXCJEQVRBQkFTRV9VUkwgbm9uIGNvbmZpZ3VyXHUwMEU5ZVwiIH0sIDUwMCwgcmVxKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHNxbCA9IG5lb24oZGF0YWJhc2VVcmwpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR0VUIC9hcGkvY291cnMgXHUyMTkyIGxpc3RlIGRlcyBjb3VycyBhY3RpZnMgYXZlYyBwbGFjZXNfcmVzdGFudGVzXHJcbiAgICBpZiAobWV0aG9kID09PSBcIkdFVFwiICYmIChwYXRobmFtZSA9PT0gXCIvYXBpL2NvdXJzXCIgfHwgcGF0aG5hbWUgPT09IFwiL2FwaS9jb3Vycy9cIikpIHtcclxuICAgICAgY29uc3QgYWN0aWZPbmx5ID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJhY3RpZl9vbmx5XCIpICE9PSBcImZhbHNlXCI7XHJcbiAgICAgIGNvbnN0IGNvdXJzZXMgPSBhY3RpZk9ubHlcclxuICAgICAgICA/IGF3YWl0IHNxbGBTRUxFQ1QgKiBGUk9NIGNvdXJzZXMgV0hFUkUgYWN0aWYgPSB0cnVlIE9SREVSIEJZIGRpc2NpcGxpbmUsIHR5cGVfY291cnMsIGpvdXJgXHJcbiAgICAgICAgOiBhd2FpdCBzcWxgU0VMRUNUICogRlJPTSBjb3Vyc2VzIE9SREVSIEJZIGRpc2NpcGxpbmUsIHR5cGVfY291cnMsIGpvdXJgO1xyXG4gICAgICBjb25zdCBjb3VudHMgPSBhd2FpdCBzcWxgXHJcbiAgICAgICAgU0VMRUNUIGNvdXJzZV9pZCwgQ09VTlQoKik6OmludCBBUyBjbnRcclxuICAgICAgICBGUk9NIGluc2NyaXB0aW9uc1xyXG4gICAgICAgIEdST1VQIEJZIGNvdXJzZV9pZFxyXG4gICAgICBgO1xyXG4gICAgICBjb25zdCBjb3VudEJ5Q291cnNlID0gT2JqZWN0LmZyb21FbnRyaWVzKChjb3VudHMgfHwgW10pLm1hcCgocikgPT4gW3IuY291cnNlX2lkLCByLmNudF0pKTtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gKGNvdXJzZXMgfHwgW10pLm1hcCgoYykgPT4ge1xyXG4gICAgICAgIGNvbnN0IGNvdW50ID0gY291bnRCeUNvdXJzZVtjLmlkXSB8fCAwO1xyXG4gICAgICAgIGNvbnN0IHBsYWNlc19yZXN0YW50ZXMgPSBNYXRoLm1heCgwLCAoYy5wbGFjZXNfbWF4IHx8IDApIC0gY291bnQpO1xyXG4gICAgICAgIHJldHVybiB7IC4uLmMsIHBsYWNlc19yZXN0YW50ZXMgfTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBqc29uUmVzcG9uc2UocmVzdWx0LCAyMDAsIHJlcSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR0VUIC9hcGkvY291cnMvOnNsdWcgb3UgOmlkXHJcbiAgICBjb25zdCBjb3Vyc01hdGNoID0gcGF0aG5hbWUubWF0Y2goL15cXC9hcGlcXC9jb3Vyc1xcLyguKykkLyk7XHJcbiAgICBpZiAobWV0aG9kID09PSBcIkdFVFwiICYmIGNvdXJzTWF0Y2gpIHtcclxuICAgICAgY29uc3Qgc2x1Z09ySWQgPSBkZWNvZGVVUklDb21wb25lbnQoY291cnNNYXRjaFsxXSk7XHJcbiAgICAgIGNvbnN0IGJ5SWQgPSAvXlxcZCskLy50ZXN0KHNsdWdPcklkKTtcclxuICAgICAgY29uc3Qgcm93cyA9IGJ5SWRcclxuICAgICAgICA/IGF3YWl0IHNxbGBTRUxFQ1QgKiBGUk9NIGNvdXJzZXMgV0hFUkUgaWQgPSAke3BhcnNlSW50KHNsdWdPcklkLCAxMCl9YFxyXG4gICAgICAgIDogYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBzbHVnID0gJHtzbHVnT3JJZH1gO1xyXG4gICAgICBjb25zdCBjb3Vyc2UgPSAocm93cyAmJiByb3dzWzBdKSB8fCBudWxsO1xyXG4gICAgICBpZiAoIWNvdXJzZSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQ291cnMgbm9uIHRyb3V2XHUwMEU5XCIsIDQwNCwgcmVxKTtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBjb3VudFJvd3MgPSBhd2FpdCBzcWxgU0VMRUNUIENPVU5UKCopOjppbnQgQVMgY250IEZST00gaW5zY3JpcHRpb25zIFdIRVJFIGNvdXJzZV9pZCA9ICR7Y291cnNlLmlkfWA7XHJcbiAgICAgIGNvbnN0IGNvdW50ID0gKGNvdW50Um93cyAmJiBjb3VudFJvd3NbMF0gJiYgY291bnRSb3dzWzBdLmNudCkgfHwgMDtcclxuICAgICAgY29uc3QgcGxhY2VzX3Jlc3RhbnRlcyA9IE1hdGgubWF4KDAsIChjb3Vyc2UucGxhY2VzX21heCB8fCAwKSAtIGNvdW50KTtcclxuICAgICAgY29uc3Qgb3V0ID0geyAuLi5jb3Vyc2UsIHBsYWNlc19yZXN0YW50ZXMgfTtcclxuICAgICAgcmV0dXJuIGpzb25SZXNwb25zZShvdXQsIDIwMCwgcmVxKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQT1NUIC9hcGkvaW5zY3JpcHRpb25zXHJcbiAgICBpZiAobWV0aG9kID09PSBcIlBPU1RcIiAmJiBwYXRobmFtZSA9PT0gXCIvYXBpL2luc2NyaXB0aW9uc1wiKSB7XHJcbiAgICAgIGxldCBib2R5O1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xyXG4gICAgICB9IGNhdGNoIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkJvZHkgSlNPTiBpbnZhbGlkZVwiLCA0MDAsIHJlcSk7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3Qge1xyXG4gICAgICAgIGNvdXJzZV9pZCxcclxuICAgICAgICBjb3VyczogY291cnNOb20sXHJcbiAgICAgICAgbm9tLFxyXG4gICAgICAgIGNvdXJyaWVsLFxyXG4gICAgICAgIHRlbGVwaG9uZSxcclxuICAgICAgICBwYXJ0aWNpcGFudHM6IHBhcnRpY2lwYW50c0lucHV0LFxyXG4gICAgICAgIGVuZmFudCA9IG51bGwsXHJcbiAgICAgICAgam91cl9wcmVmZXJlID0gbnVsbCxcclxuICAgICAgICBob3JhaXJlX3ByZWZlcmUgPSBudWxsLFxyXG4gICAgICAgIG1lc3NhZ2UgPSBudWxsLFxyXG4gICAgICAgIG5ld3NsZXR0ZXIgPSBmYWxzZSxcclxuICAgICAgICBlc3RfbWVtYnJlOiBlc3RNZW1icmVCb2R5LFxyXG4gICAgICB9ID0gYm9keTtcclxuXHJcbiAgICAgIGxldCBwYXJ0aWNpcGFudHMgPSBbXTtcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGFydGljaXBhbnRzSW5wdXQpICYmIHBhcnRpY2lwYW50c0lucHV0Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICBwYXJ0aWNpcGFudHMgPSBwYXJ0aWNpcGFudHNJbnB1dFxyXG4gICAgICAgICAgLm1hcCgocCkgPT4gKHtcclxuICAgICAgICAgICAgbm9tOiBTdHJpbmcoKHAgJiYgcC5ub20pIHx8IFwiXCIpLnRyaW0oKSxcclxuICAgICAgICAgICAgZW5mYW50OlxyXG4gICAgICAgICAgICAgIHAgJiYgcC5lbmZhbnQgIT0gbnVsbCAmJiBTdHJpbmcocC5lbmZhbnQpLnRyaW0oKVxyXG4gICAgICAgICAgICAgICAgPyBTdHJpbmcocC5lbmZhbnQpLnRyaW0oKVxyXG4gICAgICAgICAgICAgICAgOiBudWxsLFxyXG4gICAgICAgICAgfSkpXHJcbiAgICAgICAgICAuZmlsdGVyKChwKSA9PiBwLm5vbSk7XHJcbiAgICAgIH0gZWxzZSBpZiAobm9tICYmIFN0cmluZyhub20pLnRyaW0oKSkge1xyXG4gICAgICAgIHBhcnRpY2lwYW50cyA9IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbm9tOiBTdHJpbmcobm9tKS50cmltKCksXHJcbiAgICAgICAgICAgIGVuZmFudDogZW5mYW50ICE9IG51bGwgJiYgU3RyaW5nKGVuZmFudCkudHJpbSgpID8gU3RyaW5nKGVuZmFudCkudHJpbSgpIDogbnVsbCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFjb3VycmllbCB8fCAhdGVsZXBob25lIHx8IHBhcnRpY2lwYW50cy5sZW5ndGggPCAxKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJjb3VycmllbCwgdGVsZXBob25lIGV0IGF1IG1vaW5zIHVuIHBhcnRpY2lwYW50IChub20pIHJlcXVpc1wiLCA0MDAsIHJlcSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHBhcnRpY2lwYW50cy5sZW5ndGggPiBNQVhfSU5TQ1JJUFRJT05fUEFSVElDSVBBTlRTKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoYE1heGltdW0gJHtNQVhfSU5TQ1JJUFRJT05fUEFSVElDSVBBTlRTfSBwZXJzb25uZXMgcGFyIGRlbWFuZGVgLCA0MDAsIHJlcSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxldCBjb3Vyc2UgPSBudWxsO1xyXG4gICAgICBpZiAoY291cnNlX2lkKSB7XHJcbiAgICAgICAgY29uc3Qgcm93cyA9IGF3YWl0IHNxbGBTRUxFQ1QgKiBGUk9NIGNvdXJzZXMgV0hFUkUgaWQgPSAke2NvdXJzZV9pZH1gO1xyXG4gICAgICAgIGNvdXJzZSA9IChyb3dzICYmIHJvd3NbMF0pIHx8IG51bGw7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKCFjb3Vyc2UgJiYgY291cnNOb20pIHtcclxuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBub20gPSAke2NvdXJzTm9tfWA7XHJcbiAgICAgICAgY291cnNlID0gKHJvd3MgJiYgcm93c1swXSkgfHwgbnVsbDtcclxuICAgICAgfVxyXG4gICAgICBpZiAoIWNvdXJzZSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQ291cnMgbm9uIHRyb3V2XHUwMEU5IChjb3Vyc2VfaWQgb3UgY291cnMgaW52YWxpZGUpXCIsIDQwMCwgcmVxKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgY291bnRSb3dzID0gYXdhaXQgc3FsYFNFTEVDVCBDT1VOVCgqKTo6aW50IEFTIGNudCBGUk9NIGluc2NyaXB0aW9ucyBXSEVSRSBjb3Vyc2VfaWQgPSAke2NvdXJzZS5pZH1gO1xyXG4gICAgICBjb25zdCBjb3VudCA9IChjb3VudFJvd3MgJiYgY291bnRSb3dzWzBdICYmIGNvdW50Um93c1swXS5jbnQpIHx8IDA7XHJcbiAgICAgIGlmIChjb3VudCArIHBhcnRpY2lwYW50cy5sZW5ndGggPiAoY291cnNlLnBsYWNlc19tYXggfHwgMCkpIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcclxuICAgICAgICAgIFwiQ2UgY291cnMgZXN0IGNvbXBsZXQgb3UgaWwgbmUgcmVzdGUgcGFzIGFzc2V6IGRlIHBsYWNlcyBwb3VyIGNlIG5vbWJyZSBkZSBwZXJzb25uZXMuXCIsXHJcbiAgICAgICAgICA0MDAsXHJcbiAgICAgICAgICByZXFcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBlc3RNZW1icmVCb29sID1cclxuICAgICAgICBlc3RNZW1icmVCb2R5ID09PSB0cnVlIHx8IGVzdE1lbWJyZUJvZHkgPT09IFwib3VpXCIgfHwgZXN0TWVtYnJlQm9keSA9PT0gXCJ0cnVlXCI7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IHAgb2YgcGFydGljaXBhbnRzKSB7XHJcbiAgICAgICAgY29uc3QgZW5mYW50VmFsID0gcC5lbmZhbnQgfHwgXCJcIjtcclxuICAgICAgICBjb25zdCBkdXBSb3dzID0gYXdhaXQgc3FsYFxyXG4gICAgICAgICAgU0VMRUNUIGlkLCBjb3Vyc2VfaWQsIG5vbSwgY291cnJpZWwsIHRlbGVwaG9uZSwgZW5mYW50LCBqb3VyX3ByZWZlcmUsIGhvcmFpcmVfcHJlZmVyZSwgbWVzc2FnZSwgbmV3c2xldHRlciwgY3JlYXRlZF9hdFxyXG4gICAgICAgICAgRlJPTSBpbnNjcmlwdGlvbnNcclxuICAgICAgICAgIFdIRVJFIGNvdXJzZV9pZCA9ICR7Y291cnNlLmlkfVxyXG4gICAgICAgICAgICBBTkQgbG93ZXIodHJpbShjb3VycmllbCkpID0gbG93ZXIodHJpbSgke2NvdXJyaWVsfSkpXHJcbiAgICAgICAgICAgIEFORCBsb3dlcih0cmltKG5vbSkpID0gbG93ZXIodHJpbSgke3Aubm9tfSkpXHJcbiAgICAgICAgICAgIEFORCBjb2FsZXNjZSh0cmltKGVuZmFudCksICcnKSA9IGNvYWxlc2NlKHRyaW0oJHtlbmZhbnRWYWx9KSwgJycpXHJcbiAgICAgICAgICAgIEFORCBjcmVhdGVkX2F0ID4gbm93KCkgLSBpbnRlcnZhbCAnMTUgbWludXRlcydcclxuICAgICAgICAgIExJTUlUIDFcclxuICAgICAgICBgO1xyXG4gICAgICAgIGlmIChkdXBSb3dzICYmIGR1cFJvd3NbMF0pIHtcclxuICAgICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoeyAuLi5kdXBSb3dzWzBdLCBjb3Vyc2Vfbm9tOiBjb3Vyc2Uubm9tIH0sIDIwMCwgcmVxKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGNvbnN0IGluc2VydFF1ZXJpZXMgPSBwYXJ0aWNpcGFudHMubWFwKChwLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IG1zZyA9IGluZGV4ID09PSAwID8gbWVzc2FnZSA6IG51bGw7XHJcbiAgICAgICAgY29uc3QganAgPSBpbmRleCA9PT0gMCA/IGpvdXJfcHJlZmVyZSA6IG51bGw7XHJcbiAgICAgICAgY29uc3QgaHAgPSBpbmRleCA9PT0gMCA/IGhvcmFpcmVfcHJlZmVyZSA6IG51bGw7XHJcbiAgICAgICAgcmV0dXJuIHNxbGBcclxuICAgICAgICAgIElOU0VSVCBJTlRPIGluc2NyaXB0aW9ucyAoY291cnNlX2lkLCBub20sIGNvdXJyaWVsLCB0ZWxlcGhvbmUsIGVuZmFudCwgam91cl9wcmVmZXJlLCBob3JhaXJlX3ByZWZlcmUsIG1lc3NhZ2UsIG5ld3NsZXR0ZXIsIGVzdF9tZW1icmUsIGNyZWF0ZWRfYXQpXHJcbiAgICAgICAgICBWQUxVRVMgKCR7Y291cnNlLmlkfSwgJHtwLm5vbX0sICR7Y291cnJpZWx9LCAke3RlbGVwaG9uZX0sICR7cC5lbmZhbnR9LCAke2pwfSwgJHtocH0sICR7bXNnfSwgJHtuZXdzbGV0dGVyfSwgJHtlc3RNZW1icmVCb29sfSwgJHtjcmVhdGVkQXR9KVxyXG4gICAgICAgICAgUkVUVVJOSU5HIGlkLCBjb3Vyc2VfaWQsIG5vbSwgY291cnJpZWwsIHRlbGVwaG9uZSwgZW5mYW50LCBqb3VyX3ByZWZlcmUsIGhvcmFpcmVfcHJlZmVyZSwgbWVzc2FnZSwgbmV3c2xldHRlciwgZXN0X21lbWJyZSwgY3JlYXRlZF9hdFxyXG4gICAgICAgIGA7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbGV0IGluc2VydFJlc3VsdHM7XHJcbiAgICAgIGlmICh0eXBlb2Ygc3FsLnRyYW5zYWN0aW9uID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBpbnNlcnRSZXN1bHRzID0gYXdhaXQgc3FsLnRyYW5zYWN0aW9uKGluc2VydFF1ZXJpZXMsIHsgaXNvbGF0aW9uTGV2ZWw6IFwiUmVhZENvbW1pdHRlZFwiIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGluc2VydFJlc3VsdHMgPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IHEgb2YgaW5zZXJ0UXVlcmllcykge1xyXG4gICAgICAgICAgaW5zZXJ0UmVzdWx0cy5wdXNoKGF3YWl0IHEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZmlyc3RSb3cgPSBpbnNlcnRSZXN1bHRzWzBdICYmIGluc2VydFJlc3VsdHNbMF1bMF07XHJcbiAgICAgIGNvbnN0IGlkcyA9IGluc2VydFJlc3VsdHMubWFwKChyKSA9PiByWzBdLmlkKTtcclxuICAgICAgY29uc3QgY291cnNlTGFiZWwgPSBidWlsZENvdXJzZUxhYmVsKGNvdXJzZSk7XHJcbiAgICAgIGF3YWl0IHNlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbih7XHJcbiAgICAgICAgdG86IGNvdXJyaWVsLFxyXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZXM6IHBhcnRpY2lwYW50cy5tYXAoKHApID0+IHAubm9tKSxcclxuICAgICAgICBjb3Vyc2VMYWJlbCxcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgLi4uKGZpcnN0Um93IHx8IHt9KSxcclxuICAgICAgICAgIGluc2NyaXB0aW9uX2lkczogaWRzLFxyXG4gICAgICAgICAgY291bnQ6IGlkcy5sZW5ndGgsXHJcbiAgICAgICAgICBjb3Vyc2Vfbm9tOiBjb3Vyc2Uubm9tLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgMjAxLFxyXG4gICAgICAgIHJlcVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PT09IEFETUlOIFJPVVRFUyA9PT09PVxyXG5cclxuICAgIC8vIFBPU1QgL2FwaS9hZG1pbi9sb2dpblxyXG4gICAgaWYgKG1ldGhvZCA9PT0gXCJQT1NUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9sb2dpblwiKSB7XHJcbiAgICAgIGxldCBib2R5O1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xyXG4gICAgICB9IGNhdGNoIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkJvZHkgSlNPTiBpbnZhbGlkZVwiLCA0MDAsIHJlcSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGJvZHkucGFzc3dvcmQgIT09IEFETUlOX1BBU1NXT1JEKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJNb3QgZGUgcGFzc2UgaW5jb3JyZWN0XCIsIDQwMSwgcmVxKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4ganNvblJlc3BvbnNlKHsgYWNjZXNzX3Rva2VuOiBjcmVhdGVUb2tlbigpLCB0b2tlbl90eXBlOiBcImJlYXJlclwiIH0sIDIwMCwgcmVxKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQcm90ZWN0ZWQgYWRtaW4gcm91dGVzXHJcbiAgICBpZiAocGF0aG5hbWUuc3RhcnRzV2l0aChcIi9hcGkvYWRtaW4vXCIpKSB7XHJcbiAgICAgIGlmICghdmVyaWZ5VG9rZW4ocmVxKSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiTm9uIGF1dG9yaXNcdTAwRTlcIiwgNDAxLCByZXEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHRVQgL2FwaS9hZG1pbi9jb3Vyc2VzXHJcbiAgICAgIGlmIChtZXRob2QgPT09IFwiR0VUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9jb3Vyc2VzXCIpIHtcclxuICAgICAgICBjb25zdCBjb3Vyc2VzID0gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBPUkRFUiBCWSBkaXNjaXBsaW5lLCBub21gO1xyXG4gICAgICAgIGNvbnN0IGNvdW50cyA9IGF3YWl0IHNxbGBcclxuICAgICAgICAgIFNFTEVDVCBjb3Vyc2VfaWQsIENPVU5UKCopOjppbnQgQVMgY250XHJcbiAgICAgICAgICBGUk9NIGluc2NyaXB0aW9uc1xyXG4gICAgICAgICAgR1JPVVAgQlkgY291cnNlX2lkXHJcbiAgICAgICAgYDtcclxuICAgICAgICBjb25zdCBjb3VudEJ5Q291cnNlID0gT2JqZWN0LmZyb21FbnRyaWVzKChjb3VudHMgfHwgW10pLm1hcCgocikgPT4gW3IuY291cnNlX2lkLCByLmNudF0pKTtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSAoY291cnNlcyB8fCBbXSkubWFwKChjKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBjb3VudCA9IGNvdW50QnlDb3Vyc2VbYy5pZF0gfHwgMDtcclxuICAgICAgICAgIGNvbnN0IHBsYWNlc19yZXN0YW50ZXMgPSBNYXRoLm1heCgwLCAoYy5wbGFjZXNfbWF4IHx8IDApIC0gY291bnQpO1xyXG4gICAgICAgICAgcmV0dXJuIHsgLi4uYywgcGxhY2VzX3Jlc3RhbnRlcyB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UocmVzdWx0LCAyMDAsIHJlcSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFBVVCAvYXBpL2FkbWluL2NvdXJzZXMvOmlkIFx1MjAxNCBwbGFjZXNfbWF4IGV0L291IGFjdGlmIChib29sXHUwMEU5ZW4pXHJcbiAgICAgIGNvbnN0IGFkbWluQ291cnNlUHV0ID0gcGF0aG5hbWUubWF0Y2goL15cXC9hcGlcXC9hZG1pblxcL2NvdXJzZXNcXC8oXFxkKykkLyk7XHJcbiAgICAgIGlmIChtZXRob2QgPT09IFwiUFVUXCIgJiYgYWRtaW5Db3Vyc2VQdXQpIHtcclxuICAgICAgICBjb25zdCBjb3Vyc2VJZCA9IHBhcnNlSW50KGFkbWluQ291cnNlUHV0WzFdLCAxMCk7XHJcbiAgICAgICAgbGV0IGJvZHk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJCb2R5IEpTT04gaW52YWxpZGVcIiwgNDAwLCByZXEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBpZCA9ICR7Y291cnNlSWR9IExJTUlUIDFgO1xyXG4gICAgICAgIGlmICghcm93cyB8fCAhcm93c1swXSkge1xyXG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJDb3VycyBub24gdHJvdXZcdTAwRTlcIiwgNDA0LCByZXEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBjdXIgPSByb3dzWzBdO1xyXG4gICAgICAgIGNvbnN0IGhhc1BsYWNlcyA9XHJcbiAgICAgICAgICBib2R5LnBsYWNlc19tYXggIT09IHVuZGVmaW5lZCAmJiBib2R5LnBsYWNlc19tYXggIT09IG51bGwgJiYgU3RyaW5nKGJvZHkucGxhY2VzX21heCkudHJpbSgpICE9PSBcIlwiO1xyXG4gICAgICAgIGNvbnN0IGhhc0FjdGlmID0gdHlwZW9mIGJvZHkuYWN0aWYgPT09IFwiYm9vbGVhblwiO1xyXG4gICAgICAgIGlmICghaGFzUGxhY2VzICYmICFoYXNBY3RpZikge1xyXG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJGb3VybmlyIHBsYWNlc19tYXggZXQvb3UgYWN0aWYgKGJvb2xcdTAwRTllbilcIiwgNDAwLCByZXEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgbmV4dFBsYWNlcyA9IGN1ci5wbGFjZXNfbWF4ID8/IDA7XHJcbiAgICAgICAgaWYgKGhhc1BsYWNlcykge1xyXG4gICAgICAgICAgY29uc3QgcG0gPSBib2R5LnBsYWNlc19tYXg7XHJcbiAgICAgICAgICBjb25zdCBuID1cclxuICAgICAgICAgICAgdHlwZW9mIHBtID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZShwbSkgPyBNYXRoLnRydW5jKHBtKSA6IHBhcnNlSW50KFN0cmluZyhwbSksIDEwKTtcclxuICAgICAgICAgIGlmIChOdW1iZXIuaXNOYU4obikgfHwgbiA8IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJwbGFjZXNfbWF4IGludmFsaWRlIChlbnRpZXIgXHUyMjY1IDApXCIsIDQwMCwgcmVxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIG5leHRQbGFjZXMgPSBuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgbmV4dEFjdGlmID0gISFjdXIuYWN0aWY7XHJcbiAgICAgICAgaWYgKGhhc0FjdGlmKSB7XHJcbiAgICAgICAgICBuZXh0QWN0aWYgPSBib2R5LmFjdGlmO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCB1cGRhdGVkID0gYXdhaXQgc3FsYFxyXG4gICAgICAgICAgVVBEQVRFIGNvdXJzZXMgU0VUIHBsYWNlc19tYXggPSAke25leHRQbGFjZXN9LCBhY3RpZiA9ICR7bmV4dEFjdGlmfSBXSEVSRSBpZCA9ICR7Y291cnNlSWR9IFJFVFVSTklORyAqXHJcbiAgICAgICAgYDtcclxuICAgICAgICBjb25zdCBjID0gdXBkYXRlZFswXTtcclxuICAgICAgICBjb25zdCBjb3VudFJvd3MgPSBhd2FpdCBzcWxgU0VMRUNUIENPVU5UKCopOjppbnQgQVMgY250IEZST00gaW5zY3JpcHRpb25zIFdIRVJFIGNvdXJzZV9pZCA9ICR7Y291cnNlSWR9YDtcclxuICAgICAgICBjb25zdCBjb3VudCA9IChjb3VudFJvd3MgJiYgY291bnRSb3dzWzBdICYmIGNvdW50Um93c1swXS5jbnQpIHx8IDA7XHJcbiAgICAgICAgY29uc3QgcGxhY2VzX3Jlc3RhbnRlcyA9IE1hdGgubWF4KDAsIChjLnBsYWNlc19tYXggfHwgMCkgLSBjb3VudCk7XHJcbiAgICAgICAgcmV0dXJuIGpzb25SZXNwb25zZSh7IC4uLmMsIHBsYWNlc19yZXN0YW50ZXMgfSwgMjAwLCByZXEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHRVQgL2FwaS9hZG1pbi9pbnNjcmlwdGlvbnNcclxuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJHRVRcIiAmJiBwYXRobmFtZSA9PT0gXCIvYXBpL2FkbWluL2luc2NyaXB0aW9uc1wiKSB7XHJcbiAgICAgICAgY29uc3QgY291cnNlSWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImNvdXJzZV9pZFwiKTtcclxuICAgICAgICBsZXQgaW5zY3JpcHRpb25zO1xyXG4gICAgICAgIGlmIChjb3Vyc2VJZCkge1xyXG4gICAgICAgICAgaW5zY3JpcHRpb25zID0gYXdhaXQgc3FsYFxyXG4gICAgICAgICAgICBTRUxFQ1QgaS4qLCBjLm5vbSBhcyBjb3Vyc2Vfbm9tLCBjLmRhdGVfZGVidXQgYXMgY291cnNlX2RhdGVcclxuICAgICAgICAgICAgRlJPTSBpbnNjcmlwdGlvbnMgaSBcclxuICAgICAgICAgICAgSk9JTiBjb3Vyc2VzIGMgT04gaS5jb3Vyc2VfaWQgPSBjLmlkIFxyXG4gICAgICAgICAgICBXSEVSRSBpLmNvdXJzZV9pZCA9ICR7cGFyc2VJbnQoY291cnNlSWQsIDEwKX1cclxuICAgICAgICAgICAgT1JERVIgQlkgaS5jcmVhdGVkX2F0IERFU0NcclxuICAgICAgICAgIGA7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGluc2NyaXB0aW9ucyA9IGF3YWl0IHNxbGBcclxuICAgICAgICAgICAgU0VMRUNUIGkuKiwgYy5ub20gYXMgY291cnNlX25vbSwgYy5kYXRlX2RlYnV0IGFzIGNvdXJzZV9kYXRlXHJcbiAgICAgICAgICAgIEZST00gaW5zY3JpcHRpb25zIGkgXHJcbiAgICAgICAgICAgIEpPSU4gY291cnNlcyBjIE9OIGkuY291cnNlX2lkID0gYy5pZCBcclxuICAgICAgICAgICAgT1JERVIgQlkgaS5jcmVhdGVkX2F0IERFU0NcclxuICAgICAgICAgIGA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoaW5zY3JpcHRpb25zIHx8IFtdLCAyMDAsIHJlcSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdFVCAvYXBpL2FkbWluL2luc2NyaXB0aW9ucy9leHBvcnRcclxuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJHRVRcIiAmJiBwYXRobmFtZSA9PT0gXCIvYXBpL2FkbWluL2luc2NyaXB0aW9ucy9leHBvcnRcIikge1xyXG4gICAgICAgIGNvbnN0IGNvdXJzZUlkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJjb3Vyc2VfaWRcIik7XHJcbiAgICAgICAgbGV0IGluc2NyaXB0aW9ucztcclxuICAgICAgICBpZiAoY291cnNlSWQpIHtcclxuICAgICAgICAgIGluc2NyaXB0aW9ucyA9IGF3YWl0IHNxbGBcclxuICAgICAgICAgICAgU0VMRUNUIGkuKiwgYy5ub20gYXMgY291cnNlX25vbSwgYy5kYXRlX2RlYnV0IGFzIGNvdXJzZV9kYXRlXHJcbiAgICAgICAgICAgIEZST00gaW5zY3JpcHRpb25zIGkgXHJcbiAgICAgICAgICAgIEpPSU4gY291cnNlcyBjIE9OIGkuY291cnNlX2lkID0gYy5pZCBcclxuICAgICAgICAgICAgV0hFUkUgaS5jb3Vyc2VfaWQgPSAke3BhcnNlSW50KGNvdXJzZUlkLCAxMCl9XHJcbiAgICAgICAgICAgIE9SREVSIEJZIGkuY3JlYXRlZF9hdCBERVNDXHJcbiAgICAgICAgICBgO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpbnNjcmlwdGlvbnMgPSBhd2FpdCBzcWxgXHJcbiAgICAgICAgICAgIFNFTEVDVCBpLiosIGMubm9tIGFzIGNvdXJzZV9ub20sIGMuZGF0ZV9kZWJ1dCBhcyBjb3Vyc2VfZGF0ZVxyXG4gICAgICAgICAgICBGUk9NIGluc2NyaXB0aW9ucyBpIFxyXG4gICAgICAgICAgICBKT0lOIGNvdXJzZXMgYyBPTiBpLmNvdXJzZV9pZCA9IGMuaWQgXHJcbiAgICAgICAgICAgIE9SREVSIEJZIGkuY3JlYXRlZF9hdCBERVNDXHJcbiAgICAgICAgICBgO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBCdWlsZCBDU1ZcclxuICAgICAgICBjb25zdCByb3dzID0gW1tcImlkXCIsIFwiZGF0ZV9pbnNjcmlwdGlvblwiLCBcImNvdXJzXCIsIFwiZGF0ZV9jb3Vyc1wiLCBcIm5vbVwiLCBcImNvdXJyaWVsXCIsIFwidGVsZXBob25lXCIsIFwiZW5mYW50XCIsIFwibWVzc2FnZVwiLCBcIm5ld3NsZXR0ZXJcIiwgXCJlc3RfbWVtYnJlXCJdXTtcclxuICAgICAgICBmb3IgKGNvbnN0IGkgb2YgKGluc2NyaXB0aW9ucyB8fCBbXSkpIHtcclxuICAgICAgICAgIHJvd3MucHVzaChbXHJcbiAgICAgICAgICAgIGkuaWQsXHJcbiAgICAgICAgICAgIGkuY3JlYXRlZF9hdCA/IG5ldyBEYXRlKGkuY3JlYXRlZF9hdCkudG9JU09TdHJpbmcoKSA6IFwiXCIsXHJcbiAgICAgICAgICAgIGkuY291cnNlX25vbSB8fCBcIlwiLFxyXG4gICAgICAgICAgICBpLmNvdXJzZV9kYXRlIHx8IFwiXCIsXHJcbiAgICAgICAgICAgIGkubm9tIHx8IFwiXCIsXHJcbiAgICAgICAgICAgIGkuY291cnJpZWwgfHwgXCJcIixcclxuICAgICAgICAgICAgaS50ZWxlcGhvbmUgfHwgXCJcIixcclxuICAgICAgICAgICAgaS5lbmZhbnQgfHwgXCJcIixcclxuICAgICAgICAgICAgKGkubWVzc2FnZSB8fCBcIlwiKS5yZXBsYWNlKC9cXG4vZywgXCIgXCIpLFxyXG4gICAgICAgICAgICBpLm5ld3NsZXR0ZXIgPyBcIm91aVwiIDogXCJub25cIixcclxuICAgICAgICAgICAgaS5lc3RfbWVtYnJlID8gXCJvdWlcIiA6IFwibm9uXCIsXHJcbiAgICAgICAgICBdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgY3N2ID0gcm93cy5tYXAociA9PiByLm1hcChjID0+IGBcIiR7U3RyaW5nKGMpLnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgKS5qb2luKFwiLFwiKSkuam9pbihcIlxcblwiKTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKGNzdiwge1xyXG4gICAgICAgICAgc3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwidGV4dC9jc3Y7IGNoYXJzZXQ9dXRmLThcIixcclxuICAgICAgICAgICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCI6IFwiYXR0YWNobWVudDsgZmlsZW5hbWU9aW5zY3JpcHRpb25zLmNzdlwiLFxyXG4gICAgICAgICAgICAuLi5jb3JzSGVhZGVycyhyZXEpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiTm90IEZvdW5kXCIsIDQwNCwgcmVxKTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXCJBUEkgZXJyb3I6XCIsIGVycik7XHJcbiAgICByZXR1cm4ganNvblJlc3BvbnNlKHsgZGV0YWlsOiBlcnIubWVzc2FnZSB8fCBcIkVycmV1ciBzZXJ2ZXVyXCIgfSwgNTAwLCByZXEpO1xyXG4gIH1cclxufTtcclxuIiwgIi8qKlxyXG4gKiBDb3VycmllbCB0cmFuc2FjdGlvbm5lbCBkZSBjb25maXJtYXRpb24gZCdpbnNjcmlwdGlvbiAoQVBJIFJlc2VuZCkuXHJcbiAqIE5lIGxhbmNlIHBhcyBkJ2VycmV1ciA6IGpvdXJuYWxpc2UgZXQgcmV0b3VybmUgeyBzZW50OiBib29sZWFuLCAuLi4gfS5cclxuICovXHJcblxyXG5jb25zdCBSRVNFTkRfVVJMID0gXCJodHRwczovL2FwaS5yZXNlbmQuY29tL2VtYWlsc1wiO1xyXG5cclxuZnVuY3Rpb24gZXNjYXBlSHRtbChzKSB7XHJcbiAgcmV0dXJuIFN0cmluZyhzKVxyXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxyXG4gICAgLnJlcGxhY2UoLzwvZywgXCImbHQ7XCIpXHJcbiAgICAucmVwbGFjZSgvPi9nLCBcIiZndDtcIilcclxuICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKTtcclxufVxyXG5cclxuLyoqIExpYmVsbFx1MDBFOSBsaXNpYmxlIGR1IGNvdXJzIChhbGlnblx1MDBFOSBzdXIgbGUgc1x1MDBFOWxlY3RldXIgZHUgc2l0ZSkuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBidWlsZENvdXJzZUxhYmVsKGNvdXJzZSkge1xyXG4gIGlmICghY291cnNlKSByZXR1cm4gXCJOb24gcHJcdTAwRTljaXNcdTAwRTlcIjtcclxuICBjb25zdCBwYXJ0cyA9IFtjb3Vyc2Uubm9tIHx8IFwiXCJdLmZpbHRlcihCb29sZWFuKTtcclxuICBjb25zdCBkZXRhaWxzID0gW107XHJcbiAgaWYgKGNvdXJzZS5kYXRlX2RlYnV0KSBkZXRhaWxzLnB1c2goY291cnNlLmRhdGVfZGVidXQpO1xyXG4gIGlmIChjb3Vyc2Uuam91cikgZGV0YWlscy5wdXNoKGNvdXJzZS5qb3VyKTtcclxuICBpZiAoY291cnNlLmhldXJlKSBkZXRhaWxzLnB1c2goY291cnNlLmhldXJlKTtcclxuICBpZiAoZGV0YWlscy5sZW5ndGgpIHBhcnRzLnB1c2goXCIoXCIgKyBkZXRhaWxzLmpvaW4oXCIgLSBcIikgKyBcIilcIik7XHJcbiAgY29uc3Qgb3V0ID0gcGFydHMuam9pbihcIiBcIikudHJpbSgpO1xyXG4gIHJldHVybiBvdXQgfHwgXCJWb3RyZSBjb3Vyc1wiO1xyXG59XHJcblxyXG4vKipcclxuICogQHBhcmFtIHt7IHRvOiBzdHJpbmcsIGNvdXJzZUxhYmVsOiBzdHJpbmcsIHBhcnRpY2lwYW50TmFtZXM/OiBzdHJpbmdbXSwgbm9tPzogc3RyaW5nIH19IG9wdHNcclxuICogQHJldHVybnMge1Byb21pc2U8eyBzZW50OiBib29sZWFuLCByZWFzb24/OiBzdHJpbmcsIGlkPzogc3RyaW5nIH0+fVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbih7IHRvLCBjb3Vyc2VMYWJlbCwgcGFydGljaXBhbnROYW1lcywgbm9tIH0pIHtcclxuICBjb25zdCBhcGlLZXkgPSBwcm9jZXNzLmVudi5SRVNFTkRfQVBJX0tFWTtcclxuICBjb25zdCBmcm9tID0gcHJvY2Vzcy5lbnYuQ09ORklSTUFUSU9OX0VNQUlMX0ZST007XHJcbiAgaWYgKCFhcGlLZXkgfHwgIWZyb20pIHtcclxuICAgIGNvbnNvbGUud2FybihcclxuICAgICAgXCJbc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uXSBSRVNFTkRfQVBJX0tFWSBvdSBDT05GSVJNQVRJT05fRU1BSUxfRlJPTSBtYW5xdWFudCBcdTIwMTQgY291cnJpZWwgbm9uIGVudm95XHUwMEU5XCJcclxuICAgICk7XHJcbiAgICByZXR1cm4geyBzZW50OiBmYWxzZSwgcmVhc29uOiBcIm5vdF9jb25maWd1cmVkXCIgfTtcclxuICB9XHJcbiAgY29uc3QgYWRkciA9ICh0byB8fCBcIlwiKS50cmltKCk7XHJcbiAgaWYgKCFhZGRyIHx8ICFhZGRyLmluY2x1ZGVzKFwiQFwiKSkge1xyXG4gICAgY29uc29sZS53YXJuKFwiW3NlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbl0gY291cnJpZWwgZGVzdGluYXRhaXJlIGludmFsaWRlXCIpO1xyXG4gICAgcmV0dXJuIHsgc2VudDogZmFsc2UsIHJlYXNvbjogXCJpbnZhbGlkX3RvXCIgfTtcclxuICB9XHJcblxyXG4gIGxldCBuYW1lcyA9IEFycmF5LmlzQXJyYXkocGFydGljaXBhbnROYW1lcylcclxuICAgID8gcGFydGljaXBhbnROYW1lcy5tYXAoKG4pID0+IFN0cmluZyhuIHx8IFwiXCIpLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pXHJcbiAgICA6IFtdO1xyXG4gIGlmIChuYW1lcy5sZW5ndGggPT09IDAgJiYgbm9tKSB7XHJcbiAgICBjb25zdCBvbmUgPSBTdHJpbmcobm9tKS50cmltKCk7XHJcbiAgICBpZiAob25lKSBuYW1lcyA9IFtvbmVdO1xyXG4gIH1cclxuICBpZiAobmFtZXMubGVuZ3RoID09PSAwKSBuYW1lcyA9IFtcIlwiXTtcclxuXHJcbiAgY29uc3QgcHJlbm9tID0gKG5hbWVzWzBdIHx8IFwiXCIpLnNwbGl0KC9cXHMrLylbMF0gfHwgXCJCb25qb3VyXCI7XHJcbiAgY29uc3QgbGFiZWwgPSBjb3Vyc2VMYWJlbCB8fCBcInZvdHJlIGNvdXJzXCI7XHJcbiAgY29uc3QgcGx1c2lldXJzID0gbmFtZXMubGVuZ3RoID4gMTtcclxuICBjb25zdCBsaXN0ZVRleHRlID0gbmFtZXMuZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIsIFwiKTtcclxuICBjb25zdCBsaXN0ZUh0bWwgPSBuYW1lc1xyXG4gICAgLmZpbHRlcihCb29sZWFuKVxyXG4gICAgLm1hcCgobikgPT4gYDxsaT4ke2VzY2FwZUh0bWwobil9PC9saT5gKVxyXG4gICAgLmpvaW4oXCJcIik7XHJcblxyXG4gIGNvbnN0IHN1YmplY3QgPSBcIlZvdHJlIGRlbWFuZGUgZCdpbnNjcmlwdGlvbiBcdTIwMTQgQXRlbGllcnMgU3QtRWxtZVwiO1xyXG5cclxuICBjb25zdCBjb3Jwc0xpc3RlVGV4dGUgPSBwbHVzaWV1cnNcclxuICAgID8gYFBlcnNvbm5lcyBpbnNjcml0ZXMgOlxcbiR7bmFtZXMuZmlsdGVyKEJvb2xlYW4pLm1hcCgobikgPT4gXCJcdTIwMjIgXCIgKyBuKS5qb2luKFwiXFxuXCIpfVxcblxcbmBcclxuICAgIDogXCJcIjtcclxuXHJcbiAgY29uc3QgY29ycHNMaXN0ZUh0bWwgPSBwbHVzaWV1cnNcclxuICAgID8gYDxwPlBlcnNvbm5lcyBpbnNjcml0ZXMmbmJzcDs6PC9wPjx1bD4ke2xpc3RlSHRtbH08L3VsPmBcclxuICAgIDogYDxwPjxzdHJvbmc+JHtlc2NhcGVIdG1sKG5hbWVzWzBdIHx8IFwiUGFydGljaXBhbnRcIil9PC9zdHJvbmc+PC9wPmA7XHJcblxyXG4gIGNvbnN0IHBocmFzZVBsYWNlcyA9IHBsdXNpZXVyc1xyXG4gICAgPyBcIk5vdXMgYXZvbnMgYmllbiByZVx1MDBFN3Ugdm90cmUgZGVtYW5kZSBkJ2luc2NyaXB0aW9uIHBvdXIgcGx1c2lldXJzIHBlcnNvbm5lcy5cIlxyXG4gICAgOiBcIk5vdXMgYXZvbnMgYmllbiByZVx1MDBFN3Ugdm90cmUgZGVtYW5kZSBkJ2luc2NyaXB0aW9uLlwiO1xyXG5cclxuICBjb25zdCB0ZXh0ID0gYEJvbmpvdXIgJHtwcmVub219LFxyXG5cclxuJHtwaHJhc2VQbGFjZXN9XHJcbkNvdXJzIDogJHtsYWJlbH0uXHJcblxyXG4ke2NvcnBzTGlzdGVUZXh0ZX1Wb3RyZSBkZW1hbmRlIGEgXHUwMEU5dFx1MDBFOSBlbnZveVx1MDBFOWUgYXZlYyBzdWNjXHUwMEU4cy4gTm91cyB2b3VzIGNvbnRhY3Rlcm9ucyBkYW5zIGxlcyBwcm9jaGFpbnMgam91cnMgcG91ciBjb25maXJtZXIgJHtwbHVzaWV1cnMgPyBcImxlcyBwbGFjZXNcIiA6IFwidm90cmUgcGxhY2VcIn0gZXQgdm91cyB0cmFuc21ldHRyZSBsZXMgaW5mb3JtYXRpb25zIGRlIHBhaWVtZW50LlxyXG5cclxuXHUyMDE0IEwnXHUwMEU5cXVpcGUgZGVzIEF0ZWxpZXJzIFN0LUVsbWVcclxuaHR0cHM6Ly9hdGVsaWVyc3RlbG1lLmNhXHJcblBvdXIgdG91dGUgcXVlc3Rpb24gOiBpbmZvQGF0ZWxpZXJzdGVsbWUuY2FgO1xyXG5cclxuICBjb25zdCBodG1sID0gYDxwPkJvbmpvdXIgJHtlc2NhcGVIdG1sKHByZW5vbSl9LDwvcD5cclxuPHA+JHtwaHJhc2VQbGFjZXN9IENvdXJzJm5ic3A7OiA8c3Ryb25nPiR7ZXNjYXBlSHRtbChsYWJlbCl9PC9zdHJvbmc+LjwvcD5cclxuJHtjb3Jwc0xpc3RlSHRtbH1cclxuPHA+Vm90cmUgZGVtYW5kZSBhIFx1MDBFOXRcdTAwRTkgZW52b3lcdTAwRTllIGF2ZWMgc3VjY1x1MDBFOHMuIE5vdXMgdm91cyBjb250YWN0ZXJvbnMgZGFucyBsZXMgcHJvY2hhaW5zIGpvdXJzIHBvdXIgY29uZmlybWVyICR7cGx1c2lldXJzID8gXCJsZXMgcGxhY2VzXCIgOiBcInZvdHJlIHBsYWNlXCJ9IGV0IHZvdXMgdHJhbnNtZXR0cmUgbGVzIGluZm9ybWF0aW9ucyBkZSBwYWllbWVudC48L3A+XHJcbjxwPlx1MjAxNCBMJ1x1MDBFOXF1aXBlIGRlcyBBdGVsaWVycyBTdC1FbG1lPC9wPlxyXG48cD48YSBocmVmPVwiaHR0cHM6Ly9hdGVsaWVyc3RlbG1lLmNhXCI+YXRlbGllcnN0ZWxtZS5jYTwvYT4gXHUyMDE0IDxhIGhyZWY9XCJtYWlsdG86aW5mb0BhdGVsaWVyc3RlbG1lLmNhXCI+aW5mb0BhdGVsaWVyc3RlbG1lLmNhPC9hPjwvcD5gO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goUkVTRU5EX1VSTCwge1xyXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FwaUtleX1gLFxyXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZnJvbSxcclxuICAgICAgICB0bzogW2FkZHJdLFxyXG4gICAgICAgIHN1YmplY3QsXHJcbiAgICAgICAgdGV4dCxcclxuICAgICAgICBodG1sLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcy5qc29uKCkuY2F0Y2goKCkgPT4gKHt9KSk7XHJcbiAgICBpZiAoIXJlcy5vaykge1xyXG4gICAgICBjb25zb2xlLmVycm9yKFwiW3NlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbl0gUmVzZW5kIGVycm9yOlwiLCByZXMuc3RhdHVzLCBkYXRhKTtcclxuICAgICAgcmV0dXJuIHsgc2VudDogZmFsc2UsIHJlYXNvbjogXCJhcGlfZXJyb3JcIiwgc3RhdHVzOiByZXMuc3RhdHVzLCBkYXRhIH07XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhcIltzZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb25dIGVudm95XHUwMEU5IFx1MDBFMFwiLCBhZGRyLCBsaXN0ZVRleHRlIHx8IHByZW5vbSk7XHJcbiAgICByZXR1cm4geyBzZW50OiB0cnVlLCBpZDogZGF0YS5pZCB9O1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXCJbc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uXSBmZXRjaCBlcnJvcjpcIiwgZSk7XHJcbiAgICByZXR1cm4geyBzZW50OiBmYWxzZSwgcmVhc29uOiBcImZldGNoX2Vycm9yXCIsIGVycm9yOiBlLm1lc3NhZ2UgfTtcclxuICB9XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQVFBLFNBQVMsWUFBWTtBQUNyQixPQUFPLFNBQVM7OztBQ0poQixJQUFNLGFBQWE7QUFFbkIsU0FBUyxXQUFXLEdBQUc7QUFDckIsU0FBTyxPQUFPLENBQUMsRUFDWixRQUFRLE1BQU0sT0FBTyxFQUNyQixRQUFRLE1BQU0sTUFBTSxFQUNwQixRQUFRLE1BQU0sTUFBTSxFQUNwQixRQUFRLE1BQU0sUUFBUTtBQUMzQjtBQUdPLFNBQVMsaUJBQWlCLFFBQVE7QUFDdkMsTUFBSSxDQUFDLE9BQVEsUUFBTztBQUNwQixRQUFNLFFBQVEsQ0FBQyxPQUFPLE9BQU8sRUFBRSxFQUFFLE9BQU8sT0FBTztBQUMvQyxRQUFNLFVBQVUsQ0FBQztBQUNqQixNQUFJLE9BQU8sV0FBWSxTQUFRLEtBQUssT0FBTyxVQUFVO0FBQ3JELE1BQUksT0FBTyxLQUFNLFNBQVEsS0FBSyxPQUFPLElBQUk7QUFDekMsTUFBSSxPQUFPLE1BQU8sU0FBUSxLQUFLLE9BQU8sS0FBSztBQUMzQyxNQUFJLFFBQVEsT0FBUSxPQUFNLEtBQUssTUFBTSxRQUFRLEtBQUssS0FBSyxJQUFJLEdB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
