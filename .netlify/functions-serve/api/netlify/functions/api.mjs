
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
import crypto from "node:crypto";
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
function randomSlugSuffix() {
  return crypto.randomBytes(4).toString("hex");
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
      if (method === "POST" && pathname === "/api/admin/courses") {
        let body;
        try {
          body = await req.json();
        } catch {
          return errorResponse("Body JSON invalide", 400, req);
        }
        const nom = String(body.nom ?? "").trim();
        const slugBase = String(body.slug ?? "").trim().toLowerCase();
        if (!nom) return errorResponse("Le champ nom est requis", 400, req);
        if (!slugBase) return errorResponse("Le champ slug est requis", 400, req);
        const discipline = String(body.discipline ?? "ceramique").trim() || "ceramique";
        const type_cours = String(body.type_cours ?? "regulier").trim() || "regulier";
        const optStr = (v) => {
          if (v === void 0 || v === null) return null;
          const s = String(v).trim();
          return s === "" ? null : s;
        };
        const optInt = (v) => {
          if (v === void 0 || v === null || v === "") return null;
          const n = parseInt(String(v), 10);
          return Number.isNaN(n) ? null : n;
        };
        const prix = optStr(body.prix);
        const prof = optStr(body.prof);
        const salle = optStr(body.salle);
        const description = optStr(body.description);
        const page_dediee = optStr(body.page_dediee);
        const image_url = optStr(body.image_url);
        const actif = body.actif === void 0 ? true : !!body.actif;
        const badge_new = !!body.badge_new;
        const duree_semaines = optInt(body.duree_semaines);
        const creneaux = Array.isArray(body.creneaux) ? body.creneaux : null;
        const useMulti = creneaux && creneaux.length >= 2;
        if (useMulti) {
          const groupeSlug = optStr(body.groupe_slug) || `grp-${slugBase}-${randomSlugSuffix()}`;
          const inserted2 = [];
          for (let i = 0; i < creneaux.length; i++) {
            const slot = creneaux[i] || {};
            const pmRaw2 = slot.places_max;
            let placesMax2 = 6;
            if (pmRaw2 !== void 0 && pmRaw2 !== null && String(pmRaw2).trim() !== "") {
              const n = typeof pmRaw2 === "number" && Number.isFinite(pmRaw2) ? Math.trunc(pmRaw2) : parseInt(String(pmRaw2), 10);
              if (Number.isNaN(n) || n < 0) {
                return errorResponse(`places_max invalide (cr\xE9neau ${i + 1})`, 400, req);
              }
              placesMax2 = n;
            }
            let rowSlug = `${slugBase}-${i}`;
            let guard = 0;
            while (guard < 20) {
              const dup2 = await sql`SELECT id FROM courses WHERE slug = ${rowSlug} LIMIT 1`;
              if (!dup2 || !dup2[0]) break;
              rowSlug = `${slugBase}-${i}-${randomSlugSuffix()}`;
              guard += 1;
            }
            if (guard >= 20) {
              return errorResponse("Impossible de g\xE9n\xE9rer un slug unique", 400, req);
            }
            const jour2 = optStr(slot.jour);
            const creneau2 = optStr(slot.creneau);
            const heure2 = optStr(slot.heure);
            const date_debut2 = optStr(slot.date_debut);
            const row = await sql`
              INSERT INTO courses (
                nom, slug, discipline, type_cours, jour, creneau, heure, duree_semaines,
                date_debut, places_max, prix, prof, salle, description, actif, badge_new,
                page_dediee, image_url, groupe_slug
              ) VALUES (
                ${nom}, ${rowSlug}, ${discipline}, ${type_cours},
                ${jour2}, ${creneau2}, ${heure2}, ${duree_semaines},
                ${date_debut2}, ${placesMax2}, ${prix}, ${prof}, ${salle}, ${description},
                ${actif}, ${badge_new}, ${page_dediee}, ${image_url}, ${groupeSlug}
              )
              RETURNING *
            `;
            const c2 = row && row[0];
            if (!c2) {
              return errorResponse("\xC9chec de la cr\xE9ation du cours", 500, req);
            }
            inserted2.push({ ...c2, places_restantes: Math.max(0, (c2.places_max || 0) - 0) });
          }
          return jsonResponse({ groupe_slug: groupeSlug, courses: inserted2 }, 201, req);
        }
        const dup = await sql`SELECT id FROM courses WHERE slug = ${slugBase} LIMIT 1`;
        if (dup && dup[0]) {
          return errorResponse("Slug d\xE9j\xE0 utilis\xE9", 400, req);
        }
        const pmRaw = body.places_max;
        let placesMax = 6;
        if (pmRaw !== void 0 && pmRaw !== null && String(pmRaw).trim() !== "") {
          const n = typeof pmRaw === "number" && Number.isFinite(pmRaw) ? Math.trunc(pmRaw) : parseInt(String(pmRaw), 10);
          if (Number.isNaN(n) || n < 0) {
            return errorResponse("places_max invalide (entier \u2265 0)", 400, req);
          }
          placesMax = n;
        }
        const jour = optStr(body.jour);
        const creneau = optStr(body.creneau);
        const heure = optStr(body.heure);
        const date_debut = optStr(body.date_debut);
        const groupe_slug_single = optStr(body.groupe_slug);
        const inserted = await sql`
          INSERT INTO courses (
            nom, slug, discipline, type_cours, jour, creneau, heure, duree_semaines,
            date_debut, places_max, prix, prof, salle, description, actif, badge_new,
            page_dediee, image_url, groupe_slug
          ) VALUES (
            ${nom}, ${slugBase}, ${discipline}, ${type_cours},
            ${jour}, ${creneau}, ${heure}, ${duree_semaines},
            ${date_debut}, ${placesMax}, ${prix}, ${prof}, ${salle}, ${description},
            ${actif}, ${badge_new}, ${page_dediee}, ${image_url}, ${groupe_slug_single}
          )
          RETURNING *
        `;
        const c = inserted && inserted[0];
        if (!c) {
          return errorResponse("\xC9chec de la cr\xE9ation du cours", 500, req);
        }
        const places_restantes = Math.max(0, (c.places_max || 0) - 0);
        return jsonResponse({ ...c, places_restantes }, 201, req);
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
        const optStrPatch = (v) => {
          if (v === void 0 || v === null) return null;
          const s = String(v).trim();
          return s === "" ? null : s;
        };
        const optIntPatch = (v) => {
          if (v === void 0 || v === null || v === "") return null;
          const n = parseInt(String(v), 10);
          return Number.isNaN(n) ? null : n;
        };
        const next = { ...cur };
        let touched = false;
        if (body.nom !== void 0) {
          touched = true;
          const s = String(body.nom ?? "").trim();
          if (!s) return errorResponse("Le nom ne peut pas \xEAtre vide", 400, req);
          next.nom = s;
        }
        if (body.slug !== void 0) {
          touched = true;
          const s = String(body.slug ?? "").trim().toLowerCase();
          if (!s) return errorResponse("Le slug ne peut pas \xEAtre vide", 400, req);
          next.slug = s;
        }
        if (body.discipline !== void 0) {
          touched = true;
          next.discipline = String(body.discipline ?? "ceramique").trim() || "ceramique";
        }
        if (body.type_cours !== void 0) {
          touched = true;
          next.type_cours = String(body.type_cours ?? "regulier").trim() || "regulier";
        }
        if (body.jour !== void 0) {
          touched = true;
          next.jour = optStrPatch(body.jour);
        }
        if (body.creneau !== void 0) {
          touched = true;
          next.creneau = optStrPatch(body.creneau);
        }
        if (body.heure !== void 0) {
          touched = true;
          next.heure = optStrPatch(body.heure);
        }
        if (body.duree_semaines !== void 0) {
          touched = true;
          next.duree_semaines = optIntPatch(body.duree_semaines);
        }
        if (body.date_debut !== void 0) {
          touched = true;
          next.date_debut = optStrPatch(body.date_debut);
        }
        if (body.places_max !== void 0) {
          touched = true;
          const pm = body.places_max;
          let n = cur.places_max ?? 0;
          if (pm !== void 0 && pm !== null && String(pm).trim() !== "") {
            const parsed = typeof pm === "number" && Number.isFinite(pm) ? Math.trunc(pm) : parseInt(String(pm), 10);
            if (Number.isNaN(parsed) || parsed < 0) {
              return errorResponse("places_max invalide (entier \u2265 0)", 400, req);
            }
            n = parsed;
          }
          next.places_max = n;
        }
        if (body.prix !== void 0) {
          touched = true;
          next.prix = optStrPatch(body.prix);
        }
        if (body.prof !== void 0) {
          touched = true;
          next.prof = optStrPatch(body.prof);
        }
        if (body.salle !== void 0) {
          touched = true;
          next.salle = optStrPatch(body.salle);
        }
        if (body.description !== void 0) {
          touched = true;
          next.description = optStrPatch(body.description);
        }
        if (body.page_dediee !== void 0) {
          touched = true;
          next.page_dediee = optStrPatch(body.page_dediee);
        }
        if (body.image_url !== void 0) {
          touched = true;
          next.image_url = optStrPatch(body.image_url);
        }
        if (body.actif !== void 0) {
          touched = true;
          next.actif = !!body.actif;
        }
        if (body.badge_new !== void 0) {
          touched = true;
          next.badge_new = !!body.badge_new;
        }
        if (body.groupe_slug !== void 0) {
          touched = true;
          next.groupe_slug = optStrPatch(body.groupe_slug);
        }
        if (!touched) {
          return errorResponse("Aucun champ \xE0 mettre \xE0 jour", 400, req);
        }
        if (next.slug !== cur.slug) {
          const dup = await sql`SELECT id FROM courses WHERE slug = ${next.slug} AND id <> ${courseId} LIMIT 1`;
          if (dup && dup[0]) {
            return errorResponse("Slug d\xE9j\xE0 utilis\xE9", 400, req);
          }
        }
        const updated = await sql`
          UPDATE courses SET
            nom = ${next.nom},
            slug = ${next.slug},
            discipline = ${next.discipline},
            type_cours = ${next.type_cours},
            jour = ${next.jour},
            creneau = ${next.creneau},
            heure = ${next.heure},
            duree_semaines = ${next.duree_semaines},
            date_debut = ${next.date_debut},
            places_max = ${next.places_max},
            prix = ${next.prix},
            prof = ${next.prof},
            salle = ${next.salle},
            description = ${next.description},
            actif = ${next.actif},
            badge_new = ${next.badge_new},
            page_dediee = ${next.page_dediee},
            image_url = ${next.image_url},
            groupe_slug = ${next.groupe_slug}
          WHERE id = ${courseId}
          RETURNING *
        `;
        const c = updated[0];
        const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM inscriptions WHERE course_id = ${courseId}`;
        const count = countRows && countRows[0] && countRows[0].cnt || 0;
        const places_restantes = Math.max(0, (c.places_max || 0) - count);
        return jsonResponse({ ...c, places_restantes }, 200, req);
      }
      const adminCourseDelete = pathname.match(/^\/api\/admin\/courses\/(\d+)$/);
      if (method === "DELETE" && adminCourseDelete) {
        const courseId = parseInt(adminCourseDelete[1], 10);
        const exists = await sql`SELECT id FROM courses WHERE id = ${courseId} LIMIT 1`;
        if (!exists || !exists[0]) {
          return errorResponse("Cours non trouv\xE9", 404, req);
        }
        await sql`DELETE FROM inscriptions WHERE course_id = ${courseId}`;
        await sql`DELETE FROM courses WHERE id = ${courseId}`;
        return jsonResponse({ ok: true, id: courseId }, 200, req);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvYXBpLm1qcyIsICJuZXRsaWZ5L2Z1bmN0aW9ucy9saWIvc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uLm1qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXHJcbiAqIE5ldGxpZnkgRnVuY3Rpb246IEFQSSBjb3VycyArIGluc2NyaXB0aW9ucyArIGFkbWluIChOZW9uIERCKVxyXG4gKiBSXHUwMEU5cGxpcXVlIGxlIGNvbXBvcnRlbWVudCBkdSBiYWNrZW5kIEZhc3RBUEkgcG91ciBsZSBmcm9udCB2YW5pbGxhLlxyXG4gKiBSb3V0ZXM6IFxyXG4gKiAgIEdFVCAvYXBpL2NvdXJzLCBHRVQgL2FwaS9jb3Vycy86c2x1ZywgUE9TVCAvYXBpL2luc2NyaXB0aW9uc1xyXG4gKiAgIFBPU1QgL2FwaS9hZG1pbi9sb2dpbiwgR0VUIC9hcGkvYWRtaW4vY291cnNlcywgUE9TVCAvYXBpL2FkbWluL2NvdXJzZXMsXHJcbiAqICAgUFVUIC9hcGkvYWRtaW4vY291cnNlcy86aWQgKHBhcnRpZWwgb3UgY29tcGxldCksIERFTEVURSAvYXBpL2FkbWluL2NvdXJzZXMvOmlkXHJcbiAqICAgR0VUIC9hcGkvYWRtaW4vaW5zY3JpcHRpb25zLCBHRVQgL2FwaS9hZG1pbi9pbnNjcmlwdGlvbnMvZXhwb3J0XHJcbiAqL1xyXG5pbXBvcnQgeyBuZW9uIH0gZnJvbSBcIkBuZW9uZGF0YWJhc2Uvc2VydmVybGVzc1wiO1xyXG5pbXBvcnQgand0IGZyb20gXCJqc29ud2VidG9rZW5cIjtcclxuaW1wb3J0IHtcclxuICBzZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb24sXHJcbiAgYnVpbGRDb3Vyc2VMYWJlbCxcclxufSBmcm9tIFwiLi9saWIvc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uLm1qc1wiO1xyXG5pbXBvcnQgY3J5cHRvIGZyb20gXCJub2RlOmNyeXB0b1wiO1xyXG5cclxuY29uc3QgU0VDUkVUX0tFWSA9IHByb2Nlc3MuZW52LlNFQ1JFVF9LRVkgfHwgXCJjaGFuZ2UtbWUtaW4tcHJvZHVjdGlvblwiO1xyXG5jb25zdCBBRE1JTl9QQVNTV09SRCA9IHByb2Nlc3MuZW52LkFETUlOX1BBU1NXT1JEIHx8IFwiYWRtaW5cIjtcclxuY29uc3QgTUFYX0lOU0NSSVBUSU9OX1BBUlRJQ0lQQU5UUyA9IDg7XHJcblxyXG5mdW5jdGlvbiBjb3JzSGVhZGVycyhyZXEpIHtcclxuICBjb25zdCBvcmlnaW4gPSByZXEuaGVhZGVycy5nZXQoXCJvcmlnaW5cIik7XHJcbiAgY29uc3Qgb2sgPSBvcmlnaW4gJiYgKG9yaWdpbi5zdGFydHNXaXRoKFwiaHR0cDovL2xvY2FsaG9zdFwiKSB8fCBvcmlnaW4uc3RhcnRzV2l0aChcImh0dHA6Ly8xMjcuMC4wLjFcIikgfHwgb3JpZ2luLmluY2x1ZGVzKFwibmV0bGlmeVwiKSB8fCBvcmlnaW4uaW5jbHVkZXMoXCJhdGVsaWVyc3RlbG1lXCIpKTtcclxuICBpZiAoIW9rKSByZXR1cm4ge307XHJcbiAgcmV0dXJuIHtcclxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IG9yaWdpbixcclxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIkdFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlNcIixcclxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvblwiLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRva2VuKCkge1xyXG4gIHJldHVybiBqd3Quc2lnbih7IGFkbWluOiB0cnVlIH0sIFNFQ1JFVF9LRVksIHsgZXhwaXJlc0luOiBcIjI0aFwiIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2ZXJpZnlUb2tlbihyZXEpIHtcclxuICBjb25zdCBhdXRoID0gcmVxLmhlYWRlcnMuZ2V0KFwiYXV0aG9yaXphdGlvblwiKTtcclxuICBpZiAoIWF1dGggfHwgIWF1dGguc3RhcnRzV2l0aChcIkJlYXJlciBcIikpIHJldHVybiBmYWxzZTtcclxuICBjb25zdCB0b2tlbiA9IGF1dGguc2xpY2UoNyk7XHJcbiAgdHJ5IHtcclxuICAgIGp3dC52ZXJpZnkodG9rZW4sIFNFQ1JFVF9LRVkpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBqc29uUmVzcG9uc2UoZGF0YSwgc3RhdHVzID0gMjAwLCByZXEgPSBudWxsKSB7XHJcbiAgY29uc3QgaGVhZGVycyA9IHtcclxuICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG4gICAgLy8gTGVzIHBsYWNlcyByZXN0YW50ZXMgY2hhbmdlbnQgXHUwMEUwIGNoYXF1ZSBpbnNjcmlwdGlvbiA6IG5lIHBhcyBtZXR0cmUgZW4gY2FjaGUgKG5hdmlnYXRldXIgLyBDRE4pXHJcbiAgICBcIkNhY2hlLUNvbnRyb2xcIjogXCJwcml2YXRlLCBuby1zdG9yZSwgbm8tY2FjaGUsIG11c3QtcmV2YWxpZGF0ZVwiLFxyXG4gICAgLi4uKHJlcSA/IGNvcnNIZWFkZXJzKHJlcSkgOiB7fSksXHJcbiAgfTtcclxuICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpLCB7IHN0YXR1cywgaGVhZGVycyB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShtZXNzYWdlLCBzdGF0dXMgPSA0MDAsIHJlcSA9IG51bGwpIHtcclxuICByZXR1cm4ganNvblJlc3BvbnNlKHsgZGV0YWlsOiBtZXNzYWdlIH0sIHN0YXR1cywgcmVxKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmFuZG9tU2x1Z1N1ZmZpeCgpIHtcclxuICByZXR1cm4gY3J5cHRvLnJhbmRvbUJ5dGVzKDQpLnRvU3RyaW5nKFwiaGV4XCIpO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhc3luYyAocmVxLCBjb250ZXh0KSA9PiB7XHJcbiAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsKTtcclxuICAvLyBOZXRsaWZ5IHJld3JpdGUgZW52b2llIC8ubmV0bGlmeS9mdW5jdGlvbnMvYXBpLzpzcGxhdCBcdTIxOTIgbm9ybWFsaXNlciBlbiAvYXBpLy4uLlxyXG4gIGxldCBwYXRobmFtZSA9IHVybC5wYXRobmFtZTtcclxuICBpZiAocGF0aG5hbWUuc3RhcnRzV2l0aChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvYXBpXCIpKSB7XHJcbiAgICBwYXRobmFtZSA9IFwiL2FwaVwiICsgcGF0aG5hbWUuc2xpY2UoXCIvLm5ldGxpZnkvZnVuY3Rpb25zL2FwaVwiLmxlbmd0aCkgfHwgXCIvYXBpXCI7XHJcbiAgfVxyXG4gIGNvbnN0IG1ldGhvZCA9IHJlcS5tZXRob2Q7XHJcblxyXG4gIGlmIChtZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XHJcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHsgc3RhdHVzOiAyMDQsIGhlYWRlcnM6IHsgLi4uY29yc0hlYWRlcnMocmVxKSwgXCJBY2Nlc3MtQ29udHJvbC1NYXgtQWdlXCI6IFwiODY0MDBcIiB9IH0pO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZGF0YWJhc2VVcmwgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwgfHwgcHJvY2Vzcy5lbnYuTkVUTElGWV9EQVRBQkFTRV9VUkwgfHwgcHJvY2Vzcy5lbnYuTkVUTElGWV9EQVRBQkFTRV9VUkxfVU5QT09MRUQ7XHJcbiAgaWYgKCFkYXRhYmFzZVVybCkge1xyXG4gICAgcmV0dXJuIGpzb25SZXNwb25zZSh7IGRldGFpbDogXCJEQVRBQkFTRV9VUkwgbm9uIGNvbmZpZ3VyXHUwMEU5ZVwiIH0sIDUwMCwgcmVxKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHNxbCA9IG5lb24oZGF0YWJhc2VVcmwpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR0VUIC9hcGkvY291cnMgXHUyMTkyIGxpc3RlIGRlcyBjb3VycyBhY3RpZnMgYXZlYyBwbGFjZXNfcmVzdGFudGVzXHJcbiAgICBpZiAobWV0aG9kID09PSBcIkdFVFwiICYmIChwYXRobmFtZSA9PT0gXCIvYXBpL2NvdXJzXCIgfHwgcGF0aG5hbWUgPT09IFwiL2FwaS9jb3Vycy9cIikpIHtcclxuICAgICAgY29uc3QgYWN0aWZPbmx5ID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJhY3RpZl9vbmx5XCIpICE9PSBcImZhbHNlXCI7XHJcbiAgICAgIGNvbnN0IGNvdXJzZXMgPSBhY3RpZk9ubHlcclxuICAgICAgICA/IGF3YWl0IHNxbGBTRUxFQ1QgKiBGUk9NIGNvdXJzZXMgV0hFUkUgYWN0aWYgPSB0cnVlIE9SREVSIEJZIGRpc2NpcGxpbmUsIHR5cGVfY291cnMsIGpvdXJgXHJcbiAgICAgICAgOiBhd2FpdCBzcWxgU0VMRUNUICogRlJPTSBjb3Vyc2VzIE9SREVSIEJZIGRpc2NpcGxpbmUsIHR5cGVfY291cnMsIGpvdXJgO1xyXG4gICAgICBjb25zdCBjb3VudHMgPSBhd2FpdCBzcWxgXHJcbiAgICAgICAgU0VMRUNUIGNvdXJzZV9pZCwgQ09VTlQoKik6OmludCBBUyBjbnRcclxuICAgICAgICBGUk9NIGluc2NyaXB0aW9uc1xyXG4gICAgICAgIEdST1VQIEJZIGNvdXJzZV9pZFxyXG4gICAgICBgO1xyXG4gICAgICBjb25zdCBjb3VudEJ5Q291cnNlID0gT2JqZWN0LmZyb21FbnRyaWVzKChjb3VudHMgfHwgW10pLm1hcCgocikgPT4gW3IuY291cnNlX2lkLCByLmNudF0pKTtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gKGNvdXJzZXMgfHwgW10pLm1hcCgoYykgPT4ge1xyXG4gICAgICAgIGNvbnN0IGNvdW50ID0gY291bnRCeUNvdXJzZVtjLmlkXSB8fCAwO1xyXG4gICAgICAgIGNvbnN0IHBsYWNlc19yZXN0YW50ZXMgPSBNYXRoLm1heCgwLCAoYy5wbGFjZXNfbWF4IHx8IDApIC0gY291bnQpO1xyXG4gICAgICAgIHJldHVybiB7IC4uLmMsIHBsYWNlc19yZXN0YW50ZXMgfTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBqc29uUmVzcG9uc2UocmVzdWx0LCAyMDAsIHJlcSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR0VUIC9hcGkvY291cnMvOnNsdWcgb3UgOmlkXHJcbiAgICBjb25zdCBjb3Vyc01hdGNoID0gcGF0aG5hbWUubWF0Y2goL15cXC9hcGlcXC9jb3Vyc1xcLyguKykkLyk7XHJcbiAgICBpZiAobWV0aG9kID09PSBcIkdFVFwiICYmIGNvdXJzTWF0Y2gpIHtcclxuICAgICAgY29uc3Qgc2x1Z09ySWQgPSBkZWNvZGVVUklDb21wb25lbnQoY291cnNNYXRjaFsxXSk7XHJcbiAgICAgIGNvbnN0IGJ5SWQgPSAvXlxcZCskLy50ZXN0KHNsdWdPcklkKTtcclxuICAgICAgY29uc3Qgcm93cyA9IGJ5SWRcclxuICAgICAgICA/IGF3YWl0IHNxbGBTRUxFQ1QgKiBGUk9NIGNvdXJzZXMgV0hFUkUgaWQgPSAke3BhcnNlSW50KHNsdWdPcklkLCAxMCl9YFxyXG4gICAgICAgIDogYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBzbHVnID0gJHtzbHVnT3JJZH1gO1xyXG4gICAgICBjb25zdCBjb3Vyc2UgPSAocm93cyAmJiByb3dzWzBdKSB8fCBudWxsO1xyXG4gICAgICBpZiAoIWNvdXJzZSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQ291cnMgbm9uIHRyb3V2XHUwMEU5XCIsIDQwNCwgcmVxKTtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBjb3VudFJvd3MgPSBhd2FpdCBzcWxgU0VMRUNUIENPVU5UKCopOjppbnQgQVMgY250IEZST00gaW5zY3JpcHRpb25zIFdIRVJFIGNvdXJzZV9pZCA9ICR7Y291cnNlLmlkfWA7XHJcbiAgICAgIGNvbnN0IGNvdW50ID0gKGNvdW50Um93cyAmJiBjb3VudFJvd3NbMF0gJiYgY291bnRSb3dzWzBdLmNudCkgfHwgMDtcclxuICAgICAgY29uc3QgcGxhY2VzX3Jlc3RhbnRlcyA9IE1hdGgubWF4KDAsIChjb3Vyc2UucGxhY2VzX21heCB8fCAwKSAtIGNvdW50KTtcclxuICAgICAgY29uc3Qgb3V0ID0geyAuLi5jb3Vyc2UsIHBsYWNlc19yZXN0YW50ZXMgfTtcclxuICAgICAgcmV0dXJuIGpzb25SZXNwb25zZShvdXQsIDIwMCwgcmVxKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQT1NUIC9hcGkvaW5zY3JpcHRpb25zXHJcbiAgICBpZiAobWV0aG9kID09PSBcIlBPU1RcIiAmJiBwYXRobmFtZSA9PT0gXCIvYXBpL2luc2NyaXB0aW9uc1wiKSB7XHJcbiAgICAgIGxldCBib2R5O1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xyXG4gICAgICB9IGNhdGNoIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkJvZHkgSlNPTiBpbnZhbGlkZVwiLCA0MDAsIHJlcSk7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3Qge1xyXG4gICAgICAgIGNvdXJzZV9pZCxcclxuICAgICAgICBjb3VyczogY291cnNOb20sXHJcbiAgICAgICAgbm9tLFxyXG4gICAgICAgIGNvdXJyaWVsLFxyXG4gICAgICAgIHRlbGVwaG9uZSxcclxuICAgICAgICBwYXJ0aWNpcGFudHM6IHBhcnRpY2lwYW50c0lucHV0LFxyXG4gICAgICAgIGVuZmFudCA9IG51bGwsXHJcbiAgICAgICAgam91cl9wcmVmZXJlID0gbnVsbCxcclxuICAgICAgICBob3JhaXJlX3ByZWZlcmUgPSBudWxsLFxyXG4gICAgICAgIG1lc3NhZ2UgPSBudWxsLFxyXG4gICAgICAgIG5ld3NsZXR0ZXIgPSBmYWxzZSxcclxuICAgICAgICBlc3RfbWVtYnJlOiBlc3RNZW1icmVCb2R5LFxyXG4gICAgICB9ID0gYm9keTtcclxuXHJcbiAgICAgIGxldCBwYXJ0aWNpcGFudHMgPSBbXTtcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGFydGljaXBhbnRzSW5wdXQpICYmIHBhcnRpY2lwYW50c0lucHV0Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICBwYXJ0aWNpcGFudHMgPSBwYXJ0aWNpcGFudHNJbnB1dFxyXG4gICAgICAgICAgLm1hcCgocCkgPT4gKHtcclxuICAgICAgICAgICAgbm9tOiBTdHJpbmcoKHAgJiYgcC5ub20pIHx8IFwiXCIpLnRyaW0oKSxcclxuICAgICAgICAgICAgZW5mYW50OlxyXG4gICAgICAgICAgICAgIHAgJiYgcC5lbmZhbnQgIT0gbnVsbCAmJiBTdHJpbmcocC5lbmZhbnQpLnRyaW0oKVxyXG4gICAgICAgICAgICAgICAgPyBTdHJpbmcocC5lbmZhbnQpLnRyaW0oKVxyXG4gICAgICAgICAgICAgICAgOiBudWxsLFxyXG4gICAgICAgICAgfSkpXHJcbiAgICAgICAgICAuZmlsdGVyKChwKSA9PiBwLm5vbSk7XHJcbiAgICAgIH0gZWxzZSBpZiAobm9tICYmIFN0cmluZyhub20pLnRyaW0oKSkge1xyXG4gICAgICAgIHBhcnRpY2lwYW50cyA9IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbm9tOiBTdHJpbmcobm9tKS50cmltKCksXHJcbiAgICAgICAgICAgIGVuZmFudDogZW5mYW50ICE9IG51bGwgJiYgU3RyaW5nKGVuZmFudCkudHJpbSgpID8gU3RyaW5nKGVuZmFudCkudHJpbSgpIDogbnVsbCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFjb3VycmllbCB8fCAhdGVsZXBob25lIHx8IHBhcnRpY2lwYW50cy5sZW5ndGggPCAxKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJjb3VycmllbCwgdGVsZXBob25lIGV0IGF1IG1vaW5zIHVuIHBhcnRpY2lwYW50IChub20pIHJlcXVpc1wiLCA0MDAsIHJlcSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHBhcnRpY2lwYW50cy5sZW5ndGggPiBNQVhfSU5TQ1JJUFRJT05fUEFSVElDSVBBTlRTKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoYE1heGltdW0gJHtNQVhfSU5TQ1JJUFRJT05fUEFSVElDSVBBTlRTfSBwZXJzb25uZXMgcGFyIGRlbWFuZGVgLCA0MDAsIHJlcSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxldCBjb3Vyc2UgPSBudWxsO1xyXG4gICAgICBpZiAoY291cnNlX2lkKSB7XHJcbiAgICAgICAgY29uc3Qgcm93cyA9IGF3YWl0IHNxbGBTRUxFQ1QgKiBGUk9NIGNvdXJzZXMgV0hFUkUgaWQgPSAke2NvdXJzZV9pZH1gO1xyXG4gICAgICAgIGNvdXJzZSA9IChyb3dzICYmIHJvd3NbMF0pIHx8IG51bGw7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKCFjb3Vyc2UgJiYgY291cnNOb20pIHtcclxuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBub20gPSAke2NvdXJzTm9tfWA7XHJcbiAgICAgICAgY291cnNlID0gKHJvd3MgJiYgcm93c1swXSkgfHwgbnVsbDtcclxuICAgICAgfVxyXG4gICAgICBpZiAoIWNvdXJzZSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQ291cnMgbm9uIHRyb3V2XHUwMEU5IChjb3Vyc2VfaWQgb3UgY291cnMgaW52YWxpZGUpXCIsIDQwMCwgcmVxKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgY291bnRSb3dzID0gYXdhaXQgc3FsYFNFTEVDVCBDT1VOVCgqKTo6aW50IEFTIGNudCBGUk9NIGluc2NyaXB0aW9ucyBXSEVSRSBjb3Vyc2VfaWQgPSAke2NvdXJzZS5pZH1gO1xyXG4gICAgICBjb25zdCBjb3VudCA9IChjb3VudFJvd3MgJiYgY291bnRSb3dzWzBdICYmIGNvdW50Um93c1swXS5jbnQpIHx8IDA7XHJcbiAgICAgIGlmIChjb3VudCArIHBhcnRpY2lwYW50cy5sZW5ndGggPiAoY291cnNlLnBsYWNlc19tYXggfHwgMCkpIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcclxuICAgICAgICAgIFwiQ2UgY291cnMgZXN0IGNvbXBsZXQgb3UgaWwgbmUgcmVzdGUgcGFzIGFzc2V6IGRlIHBsYWNlcyBwb3VyIGNlIG5vbWJyZSBkZSBwZXJzb25uZXMuXCIsXHJcbiAgICAgICAgICA0MDAsXHJcbiAgICAgICAgICByZXFcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBlc3RNZW1icmVCb29sID1cclxuICAgICAgICBlc3RNZW1icmVCb2R5ID09PSB0cnVlIHx8IGVzdE1lbWJyZUJvZHkgPT09IFwib3VpXCIgfHwgZXN0TWVtYnJlQm9keSA9PT0gXCJ0cnVlXCI7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IHAgb2YgcGFydGljaXBhbnRzKSB7XHJcbiAgICAgICAgY29uc3QgZW5mYW50VmFsID0gcC5lbmZhbnQgfHwgXCJcIjtcclxuICAgICAgICBjb25zdCBkdXBSb3dzID0gYXdhaXQgc3FsYFxyXG4gICAgICAgICAgU0VMRUNUIGlkLCBjb3Vyc2VfaWQsIG5vbSwgY291cnJpZWwsIHRlbGVwaG9uZSwgZW5mYW50LCBqb3VyX3ByZWZlcmUsIGhvcmFpcmVfcHJlZmVyZSwgbWVzc2FnZSwgbmV3c2xldHRlciwgY3JlYXRlZF9hdFxyXG4gICAgICAgICAgRlJPTSBpbnNjcmlwdGlvbnNcclxuICAgICAgICAgIFdIRVJFIGNvdXJzZV9pZCA9ICR7Y291cnNlLmlkfVxyXG4gICAgICAgICAgICBBTkQgbG93ZXIodHJpbShjb3VycmllbCkpID0gbG93ZXIodHJpbSgke2NvdXJyaWVsfSkpXHJcbiAgICAgICAgICAgIEFORCBsb3dlcih0cmltKG5vbSkpID0gbG93ZXIodHJpbSgke3Aubm9tfSkpXHJcbiAgICAgICAgICAgIEFORCBjb2FsZXNjZSh0cmltKGVuZmFudCksICcnKSA9IGNvYWxlc2NlKHRyaW0oJHtlbmZhbnRWYWx9KSwgJycpXHJcbiAgICAgICAgICAgIEFORCBjcmVhdGVkX2F0ID4gbm93KCkgLSBpbnRlcnZhbCAnMTUgbWludXRlcydcclxuICAgICAgICAgIExJTUlUIDFcclxuICAgICAgICBgO1xyXG4gICAgICAgIGlmIChkdXBSb3dzICYmIGR1cFJvd3NbMF0pIHtcclxuICAgICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoeyAuLi5kdXBSb3dzWzBdLCBjb3Vyc2Vfbm9tOiBjb3Vyc2Uubm9tIH0sIDIwMCwgcmVxKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGNvbnN0IGluc2VydFF1ZXJpZXMgPSBwYXJ0aWNpcGFudHMubWFwKChwLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IG1zZyA9IGluZGV4ID09PSAwID8gbWVzc2FnZSA6IG51bGw7XHJcbiAgICAgICAgY29uc3QganAgPSBpbmRleCA9PT0gMCA/IGpvdXJfcHJlZmVyZSA6IG51bGw7XHJcbiAgICAgICAgY29uc3QgaHAgPSBpbmRleCA9PT0gMCA/IGhvcmFpcmVfcHJlZmVyZSA6IG51bGw7XHJcbiAgICAgICAgcmV0dXJuIHNxbGBcclxuICAgICAgICAgIElOU0VSVCBJTlRPIGluc2NyaXB0aW9ucyAoY291cnNlX2lkLCBub20sIGNvdXJyaWVsLCB0ZWxlcGhvbmUsIGVuZmFudCwgam91cl9wcmVmZXJlLCBob3JhaXJlX3ByZWZlcmUsIG1lc3NhZ2UsIG5ld3NsZXR0ZXIsIGVzdF9tZW1icmUsIGNyZWF0ZWRfYXQpXHJcbiAgICAgICAgICBWQUxVRVMgKCR7Y291cnNlLmlkfSwgJHtwLm5vbX0sICR7Y291cnJpZWx9LCAke3RlbGVwaG9uZX0sICR7cC5lbmZhbnR9LCAke2pwfSwgJHtocH0sICR7bXNnfSwgJHtuZXdzbGV0dGVyfSwgJHtlc3RNZW1icmVCb29sfSwgJHtjcmVhdGVkQXR9KVxyXG4gICAgICAgICAgUkVUVVJOSU5HIGlkLCBjb3Vyc2VfaWQsIG5vbSwgY291cnJpZWwsIHRlbGVwaG9uZSwgZW5mYW50LCBqb3VyX3ByZWZlcmUsIGhvcmFpcmVfcHJlZmVyZSwgbWVzc2FnZSwgbmV3c2xldHRlciwgZXN0X21lbWJyZSwgY3JlYXRlZF9hdFxyXG4gICAgICAgIGA7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbGV0IGluc2VydFJlc3VsdHM7XHJcbiAgICAgIGlmICh0eXBlb2Ygc3FsLnRyYW5zYWN0aW9uID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBpbnNlcnRSZXN1bHRzID0gYXdhaXQgc3FsLnRyYW5zYWN0aW9uKGluc2VydFF1ZXJpZXMsIHsgaXNvbGF0aW9uTGV2ZWw6IFwiUmVhZENvbW1pdHRlZFwiIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGluc2VydFJlc3VsdHMgPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IHEgb2YgaW5zZXJ0UXVlcmllcykge1xyXG4gICAgICAgICAgaW5zZXJ0UmVzdWx0cy5wdXNoKGF3YWl0IHEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZmlyc3RSb3cgPSBpbnNlcnRSZXN1bHRzWzBdICYmIGluc2VydFJlc3VsdHNbMF1bMF07XHJcbiAgICAgIGNvbnN0IGlkcyA9IGluc2VydFJlc3VsdHMubWFwKChyKSA9PiByWzBdLmlkKTtcclxuICAgICAgY29uc3QgY291cnNlTGFiZWwgPSBidWlsZENvdXJzZUxhYmVsKGNvdXJzZSk7XHJcbiAgICAgIGF3YWl0IHNlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbih7XHJcbiAgICAgICAgdG86IGNvdXJyaWVsLFxyXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZXM6IHBhcnRpY2lwYW50cy5tYXAoKHApID0+IHAubm9tKSxcclxuICAgICAgICBjb3Vyc2VMYWJlbCxcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgLi4uKGZpcnN0Um93IHx8IHt9KSxcclxuICAgICAgICAgIGluc2NyaXB0aW9uX2lkczogaWRzLFxyXG4gICAgICAgICAgY291bnQ6IGlkcy5sZW5ndGgsXHJcbiAgICAgICAgICBjb3Vyc2Vfbm9tOiBjb3Vyc2Uubm9tLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgMjAxLFxyXG4gICAgICAgIHJlcVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PT09IEFETUlOIFJPVVRFUyA9PT09PVxyXG5cclxuICAgIC8vIFBPU1QgL2FwaS9hZG1pbi9sb2dpblxyXG4gICAgaWYgKG1ldGhvZCA9PT0gXCJQT1NUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9sb2dpblwiKSB7XHJcbiAgICAgIGxldCBib2R5O1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xyXG4gICAgICB9IGNhdGNoIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkJvZHkgSlNPTiBpbnZhbGlkZVwiLCA0MDAsIHJlcSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGJvZHkucGFzc3dvcmQgIT09IEFETUlOX1BBU1NXT1JEKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJNb3QgZGUgcGFzc2UgaW5jb3JyZWN0XCIsIDQwMSwgcmVxKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4ganNvblJlc3BvbnNlKHsgYWNjZXNzX3Rva2VuOiBjcmVhdGVUb2tlbigpLCB0b2tlbl90eXBlOiBcImJlYXJlclwiIH0sIDIwMCwgcmVxKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQcm90ZWN0ZWQgYWRtaW4gcm91dGVzXHJcbiAgICBpZiAocGF0aG5hbWUuc3RhcnRzV2l0aChcIi9hcGkvYWRtaW4vXCIpKSB7XHJcbiAgICAgIGlmICghdmVyaWZ5VG9rZW4ocmVxKSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiTm9uIGF1dG9yaXNcdTAwRTlcIiwgNDAxLCByZXEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHRVQgL2FwaS9hZG1pbi9jb3Vyc2VzXHJcbiAgICAgIGlmIChtZXRob2QgPT09IFwiR0VUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9jb3Vyc2VzXCIpIHtcclxuICAgICAgICBjb25zdCBjb3Vyc2VzID0gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBPUkRFUiBCWSBkaXNjaXBsaW5lLCBub21gO1xyXG4gICAgICAgIGNvbnN0IGNvdW50cyA9IGF3YWl0IHNxbGBcclxuICAgICAgICAgIFNFTEVDVCBjb3Vyc2VfaWQsIENPVU5UKCopOjppbnQgQVMgY250XHJcbiAgICAgICAgICBGUk9NIGluc2NyaXB0aW9uc1xyXG4gICAgICAgICAgR1JPVVAgQlkgY291cnNlX2lkXHJcbiAgICAgICAgYDtcclxuICAgICAgICBjb25zdCBjb3VudEJ5Q291cnNlID0gT2JqZWN0LmZyb21FbnRyaWVzKChjb3VudHMgfHwgW10pLm1hcCgocikgPT4gW3IuY291cnNlX2lkLCByLmNudF0pKTtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSAoY291cnNlcyB8fCBbXSkubWFwKChjKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBjb3VudCA9IGNvdW50QnlDb3Vyc2VbYy5pZF0gfHwgMDtcclxuICAgICAgICAgIGNvbnN0IHBsYWNlc19yZXN0YW50ZXMgPSBNYXRoLm1heCgwLCAoYy5wbGFjZXNfbWF4IHx8IDApIC0gY291bnQpO1xyXG4gICAgICAgICAgcmV0dXJuIHsgLi4uYywgcGxhY2VzX3Jlc3RhbnRlcyB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UocmVzdWx0LCAyMDAsIHJlcSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFBPU1QgL2FwaS9hZG1pbi9jb3Vyc2VzIFx1MjAxNCBjclx1MDBFOWF0aW9uIChjb3JwcyBhbGlnblx1MDBFOSBzdXIgQ291cnNlQ3JlYXRlKSA7XHJcbiAgICAgIC8vIHBsdXNpZXVycyBjclx1MDBFOW5lYXV4IDogYm9keS5jcmVuZWF1eCA9IFt7IGpvdXI/LCBjcmVuZWF1PywgaGV1cmU/LCBwbGFjZXNfbWF4LCBkYXRlX2RlYnV0PyB9LCAuLi5dIChcdTIyNjUgMilcclxuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJQT1NUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9jb3Vyc2VzXCIpIHtcclxuICAgICAgICBsZXQgYm9keTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgYm9keSA9IGF3YWl0IHJlcS5qc29uKCk7XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkJvZHkgSlNPTiBpbnZhbGlkZVwiLCA0MDAsIHJlcSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IG5vbSA9IFN0cmluZyhib2R5Lm5vbSA/PyBcIlwiKS50cmltKCk7XHJcbiAgICAgICAgY29uc3Qgc2x1Z0Jhc2UgPSBTdHJpbmcoYm9keS5zbHVnID8/IFwiXCIpLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIGlmICghbm9tKSByZXR1cm4gZXJyb3JSZXNwb25zZShcIkxlIGNoYW1wIG5vbSBlc3QgcmVxdWlzXCIsIDQwMCwgcmVxKTtcclxuICAgICAgICBpZiAoIXNsdWdCYXNlKSByZXR1cm4gZXJyb3JSZXNwb25zZShcIkxlIGNoYW1wIHNsdWcgZXN0IHJlcXVpc1wiLCA0MDAsIHJlcSk7XHJcbiAgICAgICAgY29uc3QgZGlzY2lwbGluZSA9IFN0cmluZyhib2R5LmRpc2NpcGxpbmUgPz8gXCJjZXJhbWlxdWVcIikudHJpbSgpIHx8IFwiY2VyYW1pcXVlXCI7XHJcbiAgICAgICAgY29uc3QgdHlwZV9jb3VycyA9IFN0cmluZyhib2R5LnR5cGVfY291cnMgPz8gXCJyZWd1bGllclwiKS50cmltKCkgfHwgXCJyZWd1bGllclwiO1xyXG5cclxuICAgICAgICBjb25zdCBvcHRTdHIgPSAodikgPT4ge1xyXG4gICAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZCB8fCB2ID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgIGNvbnN0IHMgPSBTdHJpbmcodikudHJpbSgpO1xyXG4gICAgICAgICAgcmV0dXJuIHMgPT09IFwiXCIgPyBudWxsIDogcztcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IG9wdEludCA9ICh2KSA9PiB7XHJcbiAgICAgICAgICBpZiAodiA9PT0gdW5kZWZpbmVkIHx8IHYgPT09IG51bGwgfHwgdiA9PT0gXCJcIikgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICBjb25zdCBuID0gcGFyc2VJbnQoU3RyaW5nKHYpLCAxMCk7XHJcbiAgICAgICAgICByZXR1cm4gTnVtYmVyLmlzTmFOKG4pID8gbnVsbCA6IG47XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3QgcHJpeCA9IG9wdFN0cihib2R5LnByaXgpO1xyXG4gICAgICAgIGNvbnN0IHByb2YgPSBvcHRTdHIoYm9keS5wcm9mKTtcclxuICAgICAgICBjb25zdCBzYWxsZSA9IG9wdFN0cihib2R5LnNhbGxlKTtcclxuICAgICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IG9wdFN0cihib2R5LmRlc2NyaXB0aW9uKTtcclxuICAgICAgICBjb25zdCBwYWdlX2RlZGllZSA9IG9wdFN0cihib2R5LnBhZ2VfZGVkaWVlKTtcclxuICAgICAgICBjb25zdCBpbWFnZV91cmwgPSBvcHRTdHIoYm9keS5pbWFnZV91cmwpO1xyXG4gICAgICAgIGNvbnN0IGFjdGlmID0gYm9keS5hY3RpZiA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6ICEhYm9keS5hY3RpZjtcclxuICAgICAgICBjb25zdCBiYWRnZV9uZXcgPSAhIWJvZHkuYmFkZ2VfbmV3O1xyXG4gICAgICAgIGNvbnN0IGR1cmVlX3NlbWFpbmVzID0gb3B0SW50KGJvZHkuZHVyZWVfc2VtYWluZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBjcmVuZWF1eCA9IEFycmF5LmlzQXJyYXkoYm9keS5jcmVuZWF1eCkgPyBib2R5LmNyZW5lYXV4IDogbnVsbDtcclxuICAgICAgICBjb25zdCB1c2VNdWx0aSA9IGNyZW5lYXV4ICYmIGNyZW5lYXV4Lmxlbmd0aCA+PSAyO1xyXG5cclxuICAgICAgICBpZiAodXNlTXVsdGkpIHtcclxuICAgICAgICAgIGNvbnN0IGdyb3VwZVNsdWcgPVxyXG4gICAgICAgICAgICBvcHRTdHIoYm9keS5ncm91cGVfc2x1ZykgfHwgYGdycC0ke3NsdWdCYXNlfS0ke3JhbmRvbVNsdWdTdWZmaXgoKX1gO1xyXG4gICAgICAgICAgY29uc3QgaW5zZXJ0ZWQgPSBbXTtcclxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3JlbmVhdXgubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3Qgc2xvdCA9IGNyZW5lYXV4W2ldIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25zdCBwbVJhdyA9IHNsb3QucGxhY2VzX21heDtcclxuICAgICAgICAgICAgbGV0IHBsYWNlc01heCA9IDY7XHJcbiAgICAgICAgICAgIGlmIChwbVJhdyAhPT0gdW5kZWZpbmVkICYmIHBtUmF3ICE9PSBudWxsICYmIFN0cmluZyhwbVJhdykudHJpbSgpICE9PSBcIlwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgbiA9XHJcbiAgICAgICAgICAgICAgICB0eXBlb2YgcG1SYXcgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKHBtUmF3KVxyXG4gICAgICAgICAgICAgICAgICA/IE1hdGgudHJ1bmMocG1SYXcpXHJcbiAgICAgICAgICAgICAgICAgIDogcGFyc2VJbnQoU3RyaW5nKHBtUmF3KSwgMTApO1xyXG4gICAgICAgICAgICAgIGlmIChOdW1iZXIuaXNOYU4obikgfHwgbiA8IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKGBwbGFjZXNfbWF4IGludmFsaWRlIChjclx1MDBFOW5lYXUgJHtpICsgMX0pYCwgNDAwLCByZXEpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBwbGFjZXNNYXggPSBuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCByb3dTbHVnID0gYCR7c2x1Z0Jhc2V9LSR7aX1gO1xyXG4gICAgICAgICAgICBsZXQgZ3VhcmQgPSAwO1xyXG4gICAgICAgICAgICB3aGlsZSAoZ3VhcmQgPCAyMCkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGR1cCA9IGF3YWl0IHNxbGBTRUxFQ1QgaWQgRlJPTSBjb3Vyc2VzIFdIRVJFIHNsdWcgPSAke3Jvd1NsdWd9IExJTUlUIDFgO1xyXG4gICAgICAgICAgICAgIGlmICghZHVwIHx8ICFkdXBbMF0pIGJyZWFrO1xyXG4gICAgICAgICAgICAgIHJvd1NsdWcgPSBgJHtzbHVnQmFzZX0tJHtpfS0ke3JhbmRvbVNsdWdTdWZmaXgoKX1gO1xyXG4gICAgICAgICAgICAgIGd1YXJkICs9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGd1YXJkID49IDIwKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJJbXBvc3NpYmxlIGRlIGdcdTAwRTluXHUwMEU5cmVyIHVuIHNsdWcgdW5pcXVlXCIsIDQwMCwgcmVxKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgam91ciA9IG9wdFN0cihzbG90LmpvdXIpO1xyXG4gICAgICAgICAgICBjb25zdCBjcmVuZWF1ID0gb3B0U3RyKHNsb3QuY3JlbmVhdSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGhldXJlID0gb3B0U3RyKHNsb3QuaGV1cmUpO1xyXG4gICAgICAgICAgICBjb25zdCBkYXRlX2RlYnV0ID0gb3B0U3RyKHNsb3QuZGF0ZV9kZWJ1dCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCByb3cgPSBhd2FpdCBzcWxgXHJcbiAgICAgICAgICAgICAgSU5TRVJUIElOVE8gY291cnNlcyAoXHJcbiAgICAgICAgICAgICAgICBub20sIHNsdWcsIGRpc2NpcGxpbmUsIHR5cGVfY291cnMsIGpvdXIsIGNyZW5lYXUsIGhldXJlLCBkdXJlZV9zZW1haW5lcyxcclxuICAgICAgICAgICAgICAgIGRhdGVfZGVidXQsIHBsYWNlc19tYXgsIHByaXgsIHByb2YsIHNhbGxlLCBkZXNjcmlwdGlvbiwgYWN0aWYsIGJhZGdlX25ldyxcclxuICAgICAgICAgICAgICAgIHBhZ2VfZGVkaWVlLCBpbWFnZV91cmwsIGdyb3VwZV9zbHVnXHJcbiAgICAgICAgICAgICAgKSBWQUxVRVMgKFxyXG4gICAgICAgICAgICAgICAgJHtub219LCAke3Jvd1NsdWd9LCAke2Rpc2NpcGxpbmV9LCAke3R5cGVfY291cnN9LFxyXG4gICAgICAgICAgICAgICAgJHtqb3VyfSwgJHtjcmVuZWF1fSwgJHtoZXVyZX0sICR7ZHVyZWVfc2VtYWluZXN9LFxyXG4gICAgICAgICAgICAgICAgJHtkYXRlX2RlYnV0fSwgJHtwbGFjZXNNYXh9LCAke3ByaXh9LCAke3Byb2Z9LCAke3NhbGxlfSwgJHtkZXNjcmlwdGlvbn0sXHJcbiAgICAgICAgICAgICAgICAke2FjdGlmfSwgJHtiYWRnZV9uZXd9LCAke3BhZ2VfZGVkaWVlfSwgJHtpbWFnZV91cmx9LCAke2dyb3VwZVNsdWd9XHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgIFJFVFVSTklORyAqXHJcbiAgICAgICAgICAgIGA7XHJcbiAgICAgICAgICAgIGNvbnN0IGMgPSByb3cgJiYgcm93WzBdO1xyXG4gICAgICAgICAgICBpZiAoIWMpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIlx1MDBDOWNoZWMgZGUgbGEgY3JcdTAwRTlhdGlvbiBkdSBjb3Vyc1wiLCA1MDAsIHJlcSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaW5zZXJ0ZWQucHVzaCh7IC4uLmMsIHBsYWNlc19yZXN0YW50ZXM6IE1hdGgubWF4KDAsIChjLnBsYWNlc19tYXggfHwgMCkgLSAwKSB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoeyBncm91cGVfc2x1ZzogZ3JvdXBlU2x1ZywgY291cnNlczogaW5zZXJ0ZWQgfSwgMjAxLCByZXEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZHVwID0gYXdhaXQgc3FsYFNFTEVDVCBpZCBGUk9NIGNvdXJzZXMgV0hFUkUgc2x1ZyA9ICR7c2x1Z0Jhc2V9IExJTUlUIDFgO1xyXG4gICAgICAgIGlmIChkdXAgJiYgZHVwWzBdKSB7XHJcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIlNsdWcgZFx1MDBFOWpcdTAwRTAgdXRpbGlzXHUwMEU5XCIsIDQwMCwgcmVxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHBtUmF3ID0gYm9keS5wbGFjZXNfbWF4O1xyXG4gICAgICAgIGxldCBwbGFjZXNNYXggPSA2O1xyXG4gICAgICAgIGlmIChwbVJhdyAhPT0gdW5kZWZpbmVkICYmIHBtUmF3ICE9PSBudWxsICYmIFN0cmluZyhwbVJhdykudHJpbSgpICE9PSBcIlwiKSB7XHJcbiAgICAgICAgICBjb25zdCBuID0gdHlwZW9mIHBtUmF3ID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZShwbVJhdykgPyBNYXRoLnRydW5jKHBtUmF3KSA6IHBhcnNlSW50KFN0cmluZyhwbVJhdyksIDEwKTtcclxuICAgICAgICAgIGlmIChOdW1iZXIuaXNOYU4obikgfHwgbiA8IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJwbGFjZXNfbWF4IGludmFsaWRlIChlbnRpZXIgXHUyMjY1IDApXCIsIDQwMCwgcmVxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHBsYWNlc01heCA9IG47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBqb3VyID0gb3B0U3RyKGJvZHkuam91cik7XHJcbiAgICAgICAgY29uc3QgY3JlbmVhdSA9IG9wdFN0cihib2R5LmNyZW5lYXUpO1xyXG4gICAgICAgIGNvbnN0IGhldXJlID0gb3B0U3RyKGJvZHkuaGV1cmUpO1xyXG4gICAgICAgIGNvbnN0IGRhdGVfZGVidXQgPSBvcHRTdHIoYm9keS5kYXRlX2RlYnV0KTtcclxuICAgICAgICBjb25zdCBncm91cGVfc2x1Z19zaW5nbGUgPSBvcHRTdHIoYm9keS5ncm91cGVfc2x1Zyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGluc2VydGVkID0gYXdhaXQgc3FsYFxyXG4gICAgICAgICAgSU5TRVJUIElOVE8gY291cnNlcyAoXHJcbiAgICAgICAgICAgIG5vbSwgc2x1ZywgZGlzY2lwbGluZSwgdHlwZV9jb3Vycywgam91ciwgY3JlbmVhdSwgaGV1cmUsIGR1cmVlX3NlbWFpbmVzLFxyXG4gICAgICAgICAgICBkYXRlX2RlYnV0LCBwbGFjZXNfbWF4LCBwcml4LCBwcm9mLCBzYWxsZSwgZGVzY3JpcHRpb24sIGFjdGlmLCBiYWRnZV9uZXcsXHJcbiAgICAgICAgICAgIHBhZ2VfZGVkaWVlLCBpbWFnZV91cmwsIGdyb3VwZV9zbHVnXHJcbiAgICAgICAgICApIFZBTFVFUyAoXHJcbiAgICAgICAgICAgICR7bm9tfSwgJHtzbHVnQmFzZX0sICR7ZGlzY2lwbGluZX0sICR7dHlwZV9jb3Vyc30sXHJcbiAgICAgICAgICAgICR7am91cn0sICR7Y3JlbmVhdX0sICR7aGV1cmV9LCAke2R1cmVlX3NlbWFpbmVzfSxcclxuICAgICAgICAgICAgJHtkYXRlX2RlYnV0fSwgJHtwbGFjZXNNYXh9LCAke3ByaXh9LCAke3Byb2Z9LCAke3NhbGxlfSwgJHtkZXNjcmlwdGlvbn0sXHJcbiAgICAgICAgICAgICR7YWN0aWZ9LCAke2JhZGdlX25ld30sICR7cGFnZV9kZWRpZWV9LCAke2ltYWdlX3VybH0sICR7Z3JvdXBlX3NsdWdfc2luZ2xlfVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgUkVUVVJOSU5HICpcclxuICAgICAgICBgO1xyXG4gICAgICAgIGNvbnN0IGMgPSBpbnNlcnRlZCAmJiBpbnNlcnRlZFswXTtcclxuICAgICAgICBpZiAoIWMpIHtcclxuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiXHUwMEM5Y2hlYyBkZSBsYSBjclx1MDBFOWF0aW9uIGR1IGNvdXJzXCIsIDUwMCwgcmVxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcGxhY2VzX3Jlc3RhbnRlcyA9IE1hdGgubWF4KDAsIChjLnBsYWNlc19tYXggfHwgMCkgLSAwKTtcclxuICAgICAgICByZXR1cm4ganNvblJlc3BvbnNlKHsgLi4uYywgcGxhY2VzX3Jlc3RhbnRlcyB9LCAyMDEsIHJlcSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFBVVCAvYXBpL2FkbWluL2NvdXJzZXMvOmlkIFx1MjAxNCBtaXNlIFx1MDBFMCBqb3VyIHBhcnRpZWxsZSAoY2hhbXBzIGZvdXJuaXMgdW5pcXVlbWVudClcclxuICAgICAgY29uc3QgYWRtaW5Db3Vyc2VQdXQgPSBwYXRobmFtZS5tYXRjaCgvXlxcL2FwaVxcL2FkbWluXFwvY291cnNlc1xcLyhcXGQrKSQvKTtcclxuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJQVVRcIiAmJiBhZG1pbkNvdXJzZVB1dCkge1xyXG4gICAgICAgIGNvbnN0IGNvdXJzZUlkID0gcGFyc2VJbnQoYWRtaW5Db3Vyc2VQdXRbMV0sIDEwKTtcclxuICAgICAgICBsZXQgYm9keTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgYm9keSA9IGF3YWl0IHJlcS5qc29uKCk7XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkJvZHkgSlNPTiBpbnZhbGlkZVwiLCA0MDAsIHJlcSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHJvd3MgPSBhd2FpdCBzcWxgU0VMRUNUICogRlJPTSBjb3Vyc2VzIFdIRVJFIGlkID0gJHtjb3Vyc2VJZH0gTElNSVQgMWA7XHJcbiAgICAgICAgaWYgKCFyb3dzIHx8ICFyb3dzWzBdKSB7XHJcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkNvdXJzIG5vbiB0cm91dlx1MDBFOVwiLCA0MDQsIHJlcSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGN1ciA9IHJvd3NbMF07XHJcbiAgICAgICAgY29uc3Qgb3B0U3RyUGF0Y2ggPSAodikgPT4ge1xyXG4gICAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZCB8fCB2ID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgIGNvbnN0IHMgPSBTdHJpbmcodikudHJpbSgpO1xyXG4gICAgICAgICAgcmV0dXJuIHMgPT09IFwiXCIgPyBudWxsIDogcztcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IG9wdEludFBhdGNoID0gKHYpID0+IHtcclxuICAgICAgICAgIGlmICh2ID09PSB1bmRlZmluZWQgfHwgdiA9PT0gbnVsbCB8fCB2ID09PSBcIlwiKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgIGNvbnN0IG4gPSBwYXJzZUludChTdHJpbmcodiksIDEwKTtcclxuICAgICAgICAgIHJldHVybiBOdW1iZXIuaXNOYU4obikgPyBudWxsIDogbjtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBuZXh0ID0geyAuLi5jdXIgfTtcclxuICAgICAgICBsZXQgdG91Y2hlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoYm9keS5ub20gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdG91Y2hlZCA9IHRydWU7XHJcbiAgICAgICAgICBjb25zdCBzID0gU3RyaW5nKGJvZHkubm9tID8/IFwiXCIpLnRyaW0oKTtcclxuICAgICAgICAgIGlmICghcykgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJMZSBub20gbmUgcGV1dCBwYXMgXHUwMEVBdHJlIHZpZGVcIiwgNDAwLCByZXEpO1xyXG4gICAgICAgICAgbmV4dC5ub20gPSBzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYm9keS5zbHVnICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHRvdWNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgY29uc3QgcyA9IFN0cmluZyhib2R5LnNsdWcgPz8gXCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICBpZiAoIXMpIHJldHVybiBlcnJvclJlc3BvbnNlKFwiTGUgc2x1ZyBuZSBwZXV0IHBhcyBcdTAwRUF0cmUgdmlkZVwiLCA0MDAsIHJlcSk7XHJcbiAgICAgICAgICBuZXh0LnNsdWcgPSBzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYm9keS5kaXNjaXBsaW5lICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHRvdWNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgbmV4dC5kaXNjaXBsaW5lID0gU3RyaW5nKGJvZHkuZGlzY2lwbGluZSA/PyBcImNlcmFtaXF1ZVwiKS50cmltKCkgfHwgXCJjZXJhbWlxdWVcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJvZHkudHlwZV9jb3VycyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQudHlwZV9jb3VycyA9IFN0cmluZyhib2R5LnR5cGVfY291cnMgPz8gXCJyZWd1bGllclwiKS50cmltKCkgfHwgXCJyZWd1bGllclwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYm9keS5qb3VyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHRvdWNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgbmV4dC5qb3VyID0gb3B0U3RyUGF0Y2goYm9keS5qb3VyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJvZHkuY3JlbmVhdSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQuY3JlbmVhdSA9IG9wdFN0clBhdGNoKGJvZHkuY3JlbmVhdSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChib2R5LmhldXJlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHRvdWNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgbmV4dC5oZXVyZSA9IG9wdFN0clBhdGNoKGJvZHkuaGV1cmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYm9keS5kdXJlZV9zZW1haW5lcyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQuZHVyZWVfc2VtYWluZXMgPSBvcHRJbnRQYXRjaChib2R5LmR1cmVlX3NlbWFpbmVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJvZHkuZGF0ZV9kZWJ1dCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQuZGF0ZV9kZWJ1dCA9IG9wdFN0clBhdGNoKGJvZHkuZGF0ZV9kZWJ1dCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChib2R5LnBsYWNlc19tYXggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdG91Y2hlZCA9IHRydWU7XHJcbiAgICAgICAgICBjb25zdCBwbSA9IGJvZHkucGxhY2VzX21heDtcclxuICAgICAgICAgIGxldCBuID0gY3VyLnBsYWNlc19tYXggPz8gMDtcclxuICAgICAgICAgIGlmIChwbSAhPT0gdW5kZWZpbmVkICYmIHBtICE9PSBudWxsICYmIFN0cmluZyhwbSkudHJpbSgpICE9PSBcIlwiKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9XHJcbiAgICAgICAgICAgICAgdHlwZW9mIHBtID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZShwbSkgPyBNYXRoLnRydW5jKHBtKSA6IHBhcnNlSW50KFN0cmluZyhwbSksIDEwKTtcclxuICAgICAgICAgICAgaWYgKE51bWJlci5pc05hTihwYXJzZWQpIHx8IHBhcnNlZCA8IDApIHtcclxuICAgICAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcInBsYWNlc19tYXggaW52YWxpZGUgKGVudGllciBcdTIyNjUgMClcIiwgNDAwLCByZXEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG4gPSBwYXJzZWQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBuZXh0LnBsYWNlc19tYXggPSBuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYm9keS5wcml4ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHRvdWNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgbmV4dC5wcml4ID0gb3B0U3RyUGF0Y2goYm9keS5wcml4KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJvZHkucHJvZiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQucHJvZiA9IG9wdFN0clBhdGNoKGJvZHkucHJvZik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChib2R5LnNhbGxlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHRvdWNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgbmV4dC5zYWxsZSA9IG9wdFN0clBhdGNoKGJvZHkuc2FsbGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYm9keS5kZXNjcmlwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQuZGVzY3JpcHRpb24gPSBvcHRTdHJQYXRjaChib2R5LmRlc2NyaXB0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJvZHkucGFnZV9kZWRpZWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdG91Y2hlZCA9IHRydWU7XHJcbiAgICAgICAgICBuZXh0LnBhZ2VfZGVkaWVlID0gb3B0U3RyUGF0Y2goYm9keS5wYWdlX2RlZGllZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChib2R5LmltYWdlX3VybCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQuaW1hZ2VfdXJsID0gb3B0U3RyUGF0Y2goYm9keS5pbWFnZV91cmwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYm9keS5hY3RpZiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQuYWN0aWYgPSAhIWJvZHkuYWN0aWY7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChib2R5LmJhZGdlX25ldyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcclxuICAgICAgICAgIG5leHQuYmFkZ2VfbmV3ID0gISFib2R5LmJhZGdlX25ldztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJvZHkuZ3JvdXBlX3NsdWcgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgdG91Y2hlZCA9IHRydWU7XHJcbiAgICAgICAgICBuZXh0Lmdyb3VwZV9zbHVnID0gb3B0U3RyUGF0Y2goYm9keS5ncm91cGVfc2x1Zyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRvdWNoZWQpIHtcclxuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQXVjdW4gY2hhbXAgXHUwMEUwIG1ldHRyZSBcdTAwRTAgam91clwiLCA0MDAsIHJlcSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAobmV4dC5zbHVnICE9PSBjdXIuc2x1Zykge1xyXG4gICAgICAgICAgY29uc3QgZHVwID0gYXdhaXQgc3FsYFNFTEVDVCBpZCBGUk9NIGNvdXJzZXMgV0hFUkUgc2x1ZyA9ICR7bmV4dC5zbHVnfSBBTkQgaWQgPD4gJHtjb3Vyc2VJZH0gTElNSVQgMWA7XHJcbiAgICAgICAgICBpZiAoZHVwICYmIGR1cFswXSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIlNsdWcgZFx1MDBFOWpcdTAwRTAgdXRpbGlzXHUwMEU5XCIsIDQwMCwgcmVxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHVwZGF0ZWQgPSBhd2FpdCBzcWxgXHJcbiAgICAgICAgICBVUERBVEUgY291cnNlcyBTRVRcclxuICAgICAgICAgICAgbm9tID0gJHtuZXh0Lm5vbX0sXHJcbiAgICAgICAgICAgIHNsdWcgPSAke25leHQuc2x1Z30sXHJcbiAgICAgICAgICAgIGRpc2NpcGxpbmUgPSAke25leHQuZGlzY2lwbGluZX0sXHJcbiAgICAgICAgICAgIHR5cGVfY291cnMgPSAke25leHQudHlwZV9jb3Vyc30sXHJcbiAgICAgICAgICAgIGpvdXIgPSAke25leHQuam91cn0sXHJcbiAgICAgICAgICAgIGNyZW5lYXUgPSAke25leHQuY3JlbmVhdX0sXHJcbiAgICAgICAgICAgIGhldXJlID0gJHtuZXh0LmhldXJlfSxcclxuICAgICAgICAgICAgZHVyZWVfc2VtYWluZXMgPSAke25leHQuZHVyZWVfc2VtYWluZXN9LFxyXG4gICAgICAgICAgICBkYXRlX2RlYnV0ID0gJHtuZXh0LmRhdGVfZGVidXR9LFxyXG4gICAgICAgICAgICBwbGFjZXNfbWF4ID0gJHtuZXh0LnBsYWNlc19tYXh9LFxyXG4gICAgICAgICAgICBwcml4ID0gJHtuZXh0LnByaXh9LFxyXG4gICAgICAgICAgICBwcm9mID0gJHtuZXh0LnByb2Z9LFxyXG4gICAgICAgICAgICBzYWxsZSA9ICR7bmV4dC5zYWxsZX0sXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gJHtuZXh0LmRlc2NyaXB0aW9ufSxcclxuICAgICAgICAgICAgYWN0aWYgPSAke25leHQuYWN0aWZ9LFxyXG4gICAgICAgICAgICBiYWRnZV9uZXcgPSAke25leHQuYmFkZ2VfbmV3fSxcclxuICAgICAgICAgICAgcGFnZV9kZWRpZWUgPSAke25leHQucGFnZV9kZWRpZWV9LFxyXG4gICAgICAgICAgICBpbWFnZV91cmwgPSAke25leHQuaW1hZ2VfdXJsfSxcclxuICAgICAgICAgICAgZ3JvdXBlX3NsdWcgPSAke25leHQuZ3JvdXBlX3NsdWd9XHJcbiAgICAgICAgICBXSEVSRSBpZCA9ICR7Y291cnNlSWR9XHJcbiAgICAgICAgICBSRVRVUk5JTkcgKlxyXG4gICAgICAgIGA7XHJcbiAgICAgICAgY29uc3QgYyA9IHVwZGF0ZWRbMF07XHJcbiAgICAgICAgY29uc3QgY291bnRSb3dzID0gYXdhaXQgc3FsYFNFTEVDVCBDT1VOVCgqKTo6aW50IEFTIGNudCBGUk9NIGluc2NyaXB0aW9ucyBXSEVSRSBjb3Vyc2VfaWQgPSAke2NvdXJzZUlkfWA7XHJcbiAgICAgICAgY29uc3QgY291bnQgPSAoY291bnRSb3dzICYmIGNvdW50Um93c1swXSAmJiBjb3VudFJvd3NbMF0uY250KSB8fCAwO1xyXG4gICAgICAgIGNvbnN0IHBsYWNlc19yZXN0YW50ZXMgPSBNYXRoLm1heCgwLCAoYy5wbGFjZXNfbWF4IHx8IDApIC0gY291bnQpO1xyXG4gICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoeyAuLi5jLCBwbGFjZXNfcmVzdGFudGVzIH0sIDIwMCwgcmVxKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gREVMRVRFIC9hcGkvYWRtaW4vY291cnNlcy86aWQgXHUyMDE0IHN1cHByaW1lIGxlIGNyXHUwMEU5bmVhdSBldCBsZXMgaW5zY3JpcHRpb25zIGFzc29jaVx1MDBFOWVzXHJcbiAgICAgIGNvbnN0IGFkbWluQ291cnNlRGVsZXRlID0gcGF0aG5hbWUubWF0Y2goL15cXC9hcGlcXC9hZG1pblxcL2NvdXJzZXNcXC8oXFxkKykkLyk7XHJcbiAgICAgIGlmIChtZXRob2QgPT09IFwiREVMRVRFXCIgJiYgYWRtaW5Db3Vyc2VEZWxldGUpIHtcclxuICAgICAgICBjb25zdCBjb3Vyc2VJZCA9IHBhcnNlSW50KGFkbWluQ291cnNlRGVsZXRlWzFdLCAxMCk7XHJcbiAgICAgICAgY29uc3QgZXhpc3RzID0gYXdhaXQgc3FsYFNFTEVDVCBpZCBGUk9NIGNvdXJzZXMgV0hFUkUgaWQgPSAke2NvdXJzZUlkfSBMSU1JVCAxYDtcclxuICAgICAgICBpZiAoIWV4aXN0cyB8fCAhZXhpc3RzWzBdKSB7XHJcbiAgICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkNvdXJzIG5vbiB0cm91dlx1MDBFOVwiLCA0MDQsIHJlcSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHNxbGBERUxFVEUgRlJPTSBpbnNjcmlwdGlvbnMgV0hFUkUgY291cnNlX2lkID0gJHtjb3Vyc2VJZH1gO1xyXG4gICAgICAgIGF3YWl0IHNxbGBERUxFVEUgRlJPTSBjb3Vyc2VzIFdIRVJFIGlkID0gJHtjb3Vyc2VJZH1gO1xyXG4gICAgICAgIHJldHVybiBqc29uUmVzcG9uc2UoeyBvazogdHJ1ZSwgaWQ6IGNvdXJzZUlkIH0sIDIwMCwgcmVxKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR0VUIC9hcGkvYWRtaW4vaW5zY3JpcHRpb25zXHJcbiAgICAgIGlmIChtZXRob2QgPT09IFwiR0VUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9pbnNjcmlwdGlvbnNcIikge1xyXG4gICAgICAgIGNvbnN0IGNvdXJzZUlkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJjb3Vyc2VfaWRcIik7XHJcbiAgICAgICAgbGV0IGluc2NyaXB0aW9ucztcclxuICAgICAgICBpZiAoY291cnNlSWQpIHtcclxuICAgICAgICAgIGluc2NyaXB0aW9ucyA9IGF3YWl0IHNxbGBcclxuICAgICAgICAgICAgU0VMRUNUIGkuKiwgYy5ub20gYXMgY291cnNlX25vbSwgYy5kYXRlX2RlYnV0IGFzIGNvdXJzZV9kYXRlXHJcbiAgICAgICAgICAgIEZST00gaW5zY3JpcHRpb25zIGkgXHJcbiAgICAgICAgICAgIEpPSU4gY291cnNlcyBjIE9OIGkuY291cnNlX2lkID0gYy5pZCBcclxuICAgICAgICAgICAgV0hFUkUgaS5jb3Vyc2VfaWQgPSAke3BhcnNlSW50KGNvdXJzZUlkLCAxMCl9XHJcbiAgICAgICAgICAgIE9SREVSIEJZIGkuY3JlYXRlZF9hdCBERVNDXHJcbiAgICAgICAgICBgO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpbnNjcmlwdGlvbnMgPSBhd2FpdCBzcWxgXHJcbiAgICAgICAgICAgIFNFTEVDVCBpLiosIGMubm9tIGFzIGNvdXJzZV9ub20sIGMuZGF0ZV9kZWJ1dCBhcyBjb3Vyc2VfZGF0ZVxyXG4gICAgICAgICAgICBGUk9NIGluc2NyaXB0aW9ucyBpIFxyXG4gICAgICAgICAgICBKT0lOIGNvdXJzZXMgYyBPTiBpLmNvdXJzZV9pZCA9IGMuaWQgXHJcbiAgICAgICAgICAgIE9SREVSIEJZIGkuY3JlYXRlZF9hdCBERVNDXHJcbiAgICAgICAgICBgO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ganNvblJlc3BvbnNlKGluc2NyaXB0aW9ucyB8fCBbXSwgMjAwLCByZXEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHRVQgL2FwaS9hZG1pbi9pbnNjcmlwdGlvbnMvZXhwb3J0XHJcbiAgICAgIGlmIChtZXRob2QgPT09IFwiR0VUXCIgJiYgcGF0aG5hbWUgPT09IFwiL2FwaS9hZG1pbi9pbnNjcmlwdGlvbnMvZXhwb3J0XCIpIHtcclxuICAgICAgICBjb25zdCBjb3Vyc2VJZCA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwiY291cnNlX2lkXCIpO1xyXG4gICAgICAgIGxldCBpbnNjcmlwdGlvbnM7XHJcbiAgICAgICAgaWYgKGNvdXJzZUlkKSB7XHJcbiAgICAgICAgICBpbnNjcmlwdGlvbnMgPSBhd2FpdCBzcWxgXHJcbiAgICAgICAgICAgIFNFTEVDVCBpLiosIGMubm9tIGFzIGNvdXJzZV9ub20sIGMuZGF0ZV9kZWJ1dCBhcyBjb3Vyc2VfZGF0ZVxyXG4gICAgICAgICAgICBGUk9NIGluc2NyaXB0aW9ucyBpIFxyXG4gICAgICAgICAgICBKT0lOIGNvdXJzZXMgYyBPTiBpLmNvdXJzZV9pZCA9IGMuaWQgXHJcbiAgICAgICAgICAgIFdIRVJFIGkuY291cnNlX2lkID0gJHtwYXJzZUludChjb3Vyc2VJZCwgMTApfVxyXG4gICAgICAgICAgICBPUkRFUiBCWSBpLmNyZWF0ZWRfYXQgREVTQ1xyXG4gICAgICAgICAgYDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaW5zY3JpcHRpb25zID0gYXdhaXQgc3FsYFxyXG4gICAgICAgICAgICBTRUxFQ1QgaS4qLCBjLm5vbSBhcyBjb3Vyc2Vfbm9tLCBjLmRhdGVfZGVidXQgYXMgY291cnNlX2RhdGVcclxuICAgICAgICAgICAgRlJPTSBpbnNjcmlwdGlvbnMgaSBcclxuICAgICAgICAgICAgSk9JTiBjb3Vyc2VzIGMgT04gaS5jb3Vyc2VfaWQgPSBjLmlkIFxyXG4gICAgICAgICAgICBPUkRFUiBCWSBpLmNyZWF0ZWRfYXQgREVTQ1xyXG4gICAgICAgICAgYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQnVpbGQgQ1NWXHJcbiAgICAgICAgY29uc3Qgcm93cyA9IFtbXCJpZFwiLCBcImRhdGVfaW5zY3JpcHRpb25cIiwgXCJjb3Vyc1wiLCBcImRhdGVfY291cnNcIiwgXCJub21cIiwgXCJjb3VycmllbFwiLCBcInRlbGVwaG9uZVwiLCBcImVuZmFudFwiLCBcIm1lc3NhZ2VcIiwgXCJuZXdzbGV0dGVyXCIsIFwiZXN0X21lbWJyZVwiXV07XHJcbiAgICAgICAgZm9yIChjb25zdCBpIG9mIChpbnNjcmlwdGlvbnMgfHwgW10pKSB7XHJcbiAgICAgICAgICByb3dzLnB1c2goW1xyXG4gICAgICAgICAgICBpLmlkLFxyXG4gICAgICAgICAgICBpLmNyZWF0ZWRfYXQgPyBuZXcgRGF0ZShpLmNyZWF0ZWRfYXQpLnRvSVNPU3RyaW5nKCkgOiBcIlwiLFxyXG4gICAgICAgICAgICBpLmNvdXJzZV9ub20gfHwgXCJcIixcclxuICAgICAgICAgICAgaS5jb3Vyc2VfZGF0ZSB8fCBcIlwiLFxyXG4gICAgICAgICAgICBpLm5vbSB8fCBcIlwiLFxyXG4gICAgICAgICAgICBpLmNvdXJyaWVsIHx8IFwiXCIsXHJcbiAgICAgICAgICAgIGkudGVsZXBob25lIHx8IFwiXCIsXHJcbiAgICAgICAgICAgIGkuZW5mYW50IHx8IFwiXCIsXHJcbiAgICAgICAgICAgIChpLm1lc3NhZ2UgfHwgXCJcIikucmVwbGFjZSgvXFxuL2csIFwiIFwiKSxcclxuICAgICAgICAgICAgaS5uZXdzbGV0dGVyID8gXCJvdWlcIiA6IFwibm9uXCIsXHJcbiAgICAgICAgICAgIGkuZXN0X21lbWJyZSA/IFwib3VpXCIgOiBcIm5vblwiLFxyXG4gICAgICAgICAgXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGNzdiA9IHJvd3MubWFwKHIgPT4gci5tYXAoYyA9PiBgXCIke1N0cmluZyhjKS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYCkuam9pbihcIixcIikpLmpvaW4oXCJcXG5cIik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShjc3YsIHtcclxuICAgICAgICAgIHN0YXR1czogMjAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcInRleHQvY3N2OyBjaGFyc2V0PXV0Zi04XCIsXHJcbiAgICAgICAgICAgIFwiQ29udGVudC1EaXNwb3NpdGlvblwiOiBcImF0dGFjaG1lbnQ7IGZpbGVuYW1lPWluc2NyaXB0aW9ucy5jc3ZcIixcclxuICAgICAgICAgICAgLi4uY29yc0hlYWRlcnMocmVxKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIk5vdCBGb3VuZFwiLCA0MDQsIHJlcSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiQVBJIGVycm9yOlwiLCBlcnIpO1xyXG4gICAgcmV0dXJuIGpzb25SZXNwb25zZSh7IGRldGFpbDogZXJyLm1lc3NhZ2UgfHwgXCJFcnJldXIgc2VydmV1clwiIH0sIDUwMCwgcmVxKTtcclxuICB9XHJcbn07XHJcbiIsICIvKipcclxuICogQ291cnJpZWwgdHJhbnNhY3Rpb25uZWwgZGUgY29uZmlybWF0aW9uIGQnaW5zY3JpcHRpb24gKEFQSSBSZXNlbmQpLlxyXG4gKiBOZSBsYW5jZSBwYXMgZCdlcnJldXIgOiBqb3VybmFsaXNlIGV0IHJldG91cm5lIHsgc2VudDogYm9vbGVhbiwgLi4uIH0uXHJcbiAqL1xyXG5cclxuY29uc3QgUkVTRU5EX1VSTCA9IFwiaHR0cHM6Ly9hcGkucmVzZW5kLmNvbS9lbWFpbHNcIjtcclxuXHJcbmZ1bmN0aW9uIGVzY2FwZUh0bWwocykge1xyXG4gIHJldHVybiBTdHJpbmcocylcclxuICAgIC5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIilcclxuICAgIC5yZXBsYWNlKC88L2csIFwiJmx0O1wiKVxyXG4gICAgLnJlcGxhY2UoLz4vZywgXCImZ3Q7XCIpXHJcbiAgICAucmVwbGFjZSgvXCIvZywgXCImcXVvdDtcIik7XHJcbn1cclxuXHJcbi8qKiBMaWJlbGxcdTAwRTkgbGlzaWJsZSBkdSBjb3VycyAoYWxpZ25cdTAwRTkgc3VyIGxlIHNcdTAwRTlsZWN0ZXVyIGR1IHNpdGUpLiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb3Vyc2VMYWJlbChjb3Vyc2UpIHtcclxuICBpZiAoIWNvdXJzZSkgcmV0dXJuIFwiTm9uIHByXHUwMEU5Y2lzXHUwMEU5XCI7XHJcbiAgY29uc3QgcGFydHMgPSBbY291cnNlLm5vbSB8fCBcIlwiXS5maWx0ZXIoQm9vbGVhbik7XHJcbiAgY29uc3QgZGV0YWlscyA9IFtdO1xyXG4gIGlmIChjb3Vyc2UuZGF0ZV9kZWJ1dCkgZGV0YWlscy5wdXNoKGNvdXJzZS5kYXRlX2RlYnV0KTtcclxuICBpZiAoY291cnNlLmpvdXIpIGRldGFpbHMucHVzaChjb3Vyc2Uuam91cik7XHJcbiAgaWYgKGNvdXJzZS5oZXVyZSkgZGV0YWlscy5wdXNoKGNvdXJzZS5oZXVyZSk7XHJcbiAgaWYgKGRldGFpbHMubGVuZ3RoKSBwYXJ0cy5wdXNoKFwiKFwiICsgZGV0YWlscy5qb2luKFwiIC0gXCIpICsgXCIpXCIpO1xyXG4gIGNvbnN0IG91dCA9IHBhcnRzLmpvaW4oXCIgXCIpLnRyaW0oKTtcclxuICByZXR1cm4gb3V0IHx8IFwiVm90cmUgY291cnNcIjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSB7eyB0bzogc3RyaW5nLCBjb3Vyc2VMYWJlbDogc3RyaW5nLCBwYXJ0aWNpcGFudE5hbWVzPzogc3RyaW5nW10sIG5vbT86IHN0cmluZyB9fSBvcHRzXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPHsgc2VudDogYm9vbGVhbiwgcmVhc29uPzogc3RyaW5nLCBpZD86IHN0cmluZyB9Pn1cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb24oeyB0bywgY291cnNlTGFiZWwsIHBhcnRpY2lwYW50TmFtZXMsIG5vbSB9KSB7XHJcbiAgY29uc3QgYXBpS2V5ID0gcHJvY2Vzcy5lbnYuUkVTRU5EX0FQSV9LRVk7XHJcbiAgY29uc3QgZnJvbSA9IHByb2Nlc3MuZW52LkNPTkZJUk1BVElPTl9FTUFJTF9GUk9NO1xyXG4gIGlmICghYXBpS2V5IHx8ICFmcm9tKSB7XHJcbiAgICBjb25zb2xlLndhcm4oXHJcbiAgICAgIFwiW3NlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbl0gUkVTRU5EX0FQSV9LRVkgb3UgQ09ORklSTUFUSU9OX0VNQUlMX0ZST00gbWFucXVhbnQgXHUyMDE0IGNvdXJyaWVsIG5vbiBlbnZveVx1MDBFOVwiXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIHsgc2VudDogZmFsc2UsIHJlYXNvbjogXCJub3RfY29uZmlndXJlZFwiIH07XHJcbiAgfVxyXG4gIGNvbnN0IGFkZHIgPSAodG8gfHwgXCJcIikudHJpbSgpO1xyXG4gIGlmICghYWRkciB8fCAhYWRkci5pbmNsdWRlcyhcIkBcIikpIHtcclxuICAgIGNvbnNvbGUud2FybihcIltzZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb25dIGNvdXJyaWVsIGRlc3RpbmF0YWlyZSBpbnZhbGlkZVwiKTtcclxuICAgIHJldHVybiB7IHNlbnQ6IGZhbHNlLCByZWFzb246IFwiaW52YWxpZF90b1wiIH07XHJcbiAgfVxyXG5cclxuICBsZXQgbmFtZXMgPSBBcnJheS5pc0FycmF5KHBhcnRpY2lwYW50TmFtZXMpXHJcbiAgICA/IHBhcnRpY2lwYW50TmFtZXMubWFwKChuKSA9PiBTdHJpbmcobiB8fCBcIlwiKS50cmltKCkpLmZpbHRlcihCb29sZWFuKVxyXG4gICAgOiBbXTtcclxuICBpZiAobmFtZXMubGVuZ3RoID09PSAwICYmIG5vbSkge1xyXG4gICAgY29uc3Qgb25lID0gU3RyaW5nKG5vbSkudHJpbSgpO1xyXG4gICAgaWYgKG9uZSkgbmFtZXMgPSBbb25lXTtcclxuICB9XHJcbiAgaWYgKG5hbWVzLmxlbmd0aCA9PT0gMCkgbmFtZXMgPSBbXCJcIl07XHJcblxyXG4gIGNvbnN0IHByZW5vbSA9IChuYW1lc1swXSB8fCBcIlwiKS5zcGxpdCgvXFxzKy8pWzBdIHx8IFwiQm9uam91clwiO1xyXG4gIGNvbnN0IGxhYmVsID0gY291cnNlTGFiZWwgfHwgXCJ2b3RyZSBjb3Vyc1wiO1xyXG4gIGNvbnN0IHBsdXNpZXVycyA9IG5hbWVzLmxlbmd0aCA+IDE7XHJcbiAgY29uc3QgbGlzdGVUZXh0ZSA9IG5hbWVzLmZpbHRlcihCb29sZWFuKS5qb2luKFwiLCBcIik7XHJcbiAgY29uc3QgbGlzdGVIdG1sID0gbmFtZXNcclxuICAgIC5maWx0ZXIoQm9vbGVhbilcclxuICAgIC5tYXAoKG4pID0+IGA8bGk+JHtlc2NhcGVIdG1sKG4pfTwvbGk+YClcclxuICAgIC5qb2luKFwiXCIpO1xyXG5cclxuICBjb25zdCBzdWJqZWN0ID0gXCJWb3RyZSBkZW1hbmRlIGQnaW5zY3JpcHRpb24gXHUyMDE0IEF0ZWxpZXJzIFN0LUVsbWVcIjtcclxuXHJcbiAgY29uc3QgY29ycHNMaXN0ZVRleHRlID0gcGx1c2lldXJzXHJcbiAgICA/IGBQZXJzb25uZXMgaW5zY3JpdGVzIDpcXG4ke25hbWVzLmZpbHRlcihCb29sZWFuKS5tYXAoKG4pID0+IFwiXHUyMDIyIFwiICsgbikuam9pbihcIlxcblwiKX1cXG5cXG5gXHJcbiAgICA6IFwiXCI7XHJcblxyXG4gIGNvbnN0IGNvcnBzTGlzdGVIdG1sID0gcGx1c2lldXJzXHJcbiAgICA/IGA8cD5QZXJzb25uZXMgaW5zY3JpdGVzJm5ic3A7OjwvcD48dWw+JHtsaXN0ZUh0bWx9PC91bD5gXHJcbiAgICA6IGA8cD48c3Ryb25nPiR7ZXNjYXBlSHRtbChuYW1lc1swXSB8fCBcIlBhcnRpY2lwYW50XCIpfTwvc3Ryb25nPjwvcD5gO1xyXG5cclxuICBjb25zdCBwaHJhc2VQbGFjZXMgPSBwbHVzaWV1cnNcclxuICAgID8gXCJOb3VzIGF2b25zIGJpZW4gcmVcdTAwRTd1IHZvdHJlIGRlbWFuZGUgZCdpbnNjcmlwdGlvbiBwb3VyIHBsdXNpZXVycyBwZXJzb25uZXMuXCJcclxuICAgIDogXCJOb3VzIGF2b25zIGJpZW4gcmVcdTAwRTd1IHZvdHJlIGRlbWFuZGUgZCdpbnNjcmlwdGlvbi5cIjtcclxuXHJcbiAgY29uc3QgdGV4dCA9IGBCb25qb3VyICR7cHJlbm9tfSxcclxuXHJcbiR7cGhyYXNlUGxhY2VzfVxyXG5Db3VycyA6ICR7bGFiZWx9LlxyXG5cclxuJHtjb3Jwc0xpc3RlVGV4dGV9Vm90cmUgZGVtYW5kZSBhIFx1MDBFOXRcdTAwRTkgZW52b3lcdTAwRTllIGF2ZWMgc3VjY1x1MDBFOHMuIE5vdXMgdm91cyBjb250YWN0ZXJvbnMgZGFucyBsZXMgcHJvY2hhaW5zIGpvdXJzIHBvdXIgY29uZmlybWVyICR7cGx1c2lldXJzID8gXCJsZXMgcGxhY2VzXCIgOiBcInZvdHJlIHBsYWNlXCJ9IGV0IHZvdXMgdHJhbnNtZXR0cmUgbGVzIGluZm9ybWF0aW9ucyBkZSBwYWllbWVudC5cclxuXHJcblx1MjAxNCBMJ1x1MDBFOXF1aXBlIGRlcyBBdGVsaWVycyBTdC1FbG1lXHJcbmh0dHBzOi8vYXRlbGllcnN0ZWxtZS5jYVxyXG5Qb3VyIHRvdXRlIHF1ZXN0aW9uIDogaW5mb0BhdGVsaWVyc3RlbG1lLmNhYDtcclxuXHJcbiAgY29uc3QgaHRtbCA9IGA8cD5Cb25qb3VyICR7ZXNjYXBlSHRtbChwcmVub20pfSw8L3A+XHJcbjxwPiR7cGhyYXNlUGxhY2VzfSBDb3VycyZuYnNwOzogPHN0cm9uZz4ke2VzY2FwZUh0bWwobGFiZWwpfTwvc3Ryb25nPi48L3A+XHJcbiR7Y29ycHNMaXN0ZUh0bWx9XHJcbjxwPlZvdHJlIGRlbWFuZGUgYSBcdTAwRTl0XHUwMEU5IGVudm95XHUwMEU5ZSBhdmVjIHN1Y2NcdTAwRThzLiBOb3VzIHZvdXMgY29udGFjdGVyb25zIGRhbnMgbGVzIHByb2NoYWlucyBqb3VycyBwb3VyIGNvbmZpcm1lciAke3BsdXNpZXVycyA/IFwibGVzIHBsYWNlc1wiIDogXCJ2b3RyZSBwbGFjZVwifSBldCB2b3VzIHRyYW5zbWV0dHJlIGxlcyBpbmZvcm1hdGlvbnMgZGUgcGFpZW1lbnQuPC9wPlxyXG48cD5cdTIwMTQgTCdcdTAwRTlxdWlwZSBkZXMgQXRlbGllcnMgU3QtRWxtZTwvcD5cclxuPHA+PGEgaHJlZj1cImh0dHBzOi8vYXRlbGllcnN0ZWxtZS5jYVwiPmF0ZWxpZXJzdGVsbWUuY2E8L2E+IFx1MjAxNCA8YSBocmVmPVwibWFpbHRvOmluZm9AYXRlbGllcnN0ZWxtZS5jYVwiPmluZm9AYXRlbGllcnN0ZWxtZS5jYTwvYT48L3A+YDtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKFJFU0VORF9VUkwsIHtcclxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGZyb20sXHJcbiAgICAgICAgdG86IFthZGRyXSxcclxuICAgICAgICBzdWJqZWN0LFxyXG4gICAgICAgIHRleHQsXHJcbiAgICAgICAgaHRtbCxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXMuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpO1xyXG4gICAgaWYgKCFyZXMub2spIHtcclxuICAgICAgY29uc29sZS5lcnJvcihcIltzZW5kSW5zY3JpcHRpb25Db25maXJtYXRpb25dIFJlc2VuZCBlcnJvcjpcIiwgcmVzLnN0YXR1cywgZGF0YSk7XHJcbiAgICAgIHJldHVybiB7IHNlbnQ6IGZhbHNlLCByZWFzb246IFwiYXBpX2Vycm9yXCIsIHN0YXR1czogcmVzLnN0YXR1cywgZGF0YSB9O1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coXCJbc2VuZEluc2NyaXB0aW9uQ29uZmlybWF0aW9uXSBlbnZveVx1MDBFOSBcdTAwRTBcIiwgYWRkciwgbGlzdGVUZXh0ZSB8fCBwcmVub20pO1xyXG4gICAgcmV0dXJuIHsgc2VudDogdHJ1ZSwgaWQ6IGRhdGEuaWQgfTtcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiW3NlbmRJbnNjcmlwdGlvbkNvbmZpcm1hdGlvbl0gZmV0Y2ggZXJyb3I6XCIsIGUpO1xyXG4gICAgcmV0dXJuIHsgc2VudDogZmFsc2UsIHJlYXNvbjogXCJmZXRjaF9lcnJvclwiLCBlcnJvcjogZS5tZXNzYWdlIH07XHJcbiAgfVxyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFTQSxTQUFTLFlBQVk7QUFDckIsT0FBTyxTQUFTOzs7QUNMaEIsSUFBTSxhQUFhO0FBRW5CLFNBQVMsV0FBVyxHQUFHO0FBQ3JC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QUFBLFVBQ3pCLENBQUM7QUFBQSxRQUNIO0FBQ0EsY0FBTSxNQUFNLEtBQUssSUFBSSxPQUFLLEVBQUUsSUFBSSxPQUFLLElBQUksT0FBTyxDQUFDLEVBQUUsUUFBUSxNQUFNLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLElBQUk7QUFFL0YsZUFBTyxJQUFJLFNBQVMsS0FBSztBQUFBLFVBQ3ZCLFFBQVE7QUFBQSxVQUNSLFNBQVM7QUFBQSxZQUNQLGdCQUFnQjtBQUFBLFlBQ2hCLHVCQUF1QjtBQUFBLFlBQ3ZCLEdBQUcsWUFBWSxHQUFHO0FBQUEsVUFDcEI7QUFBQSxRQUNGLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUVBLFdBQU8sY0FBYyxhQUFhLEtBQUssR0FBRztBQUFBLEVBQzVDLFNBQVMsS0FBSztBQUNaLFlBQVEsTUFBTSxjQUFjLEdBQUc7QUFDL0IsV0FBTyxhQUFhLEVBQUUsUUFBUSxJQUFJLFdBQVcsaUJBQWlCLEdBQUcsS0FBSyxHQUFHO0FBQUEsRUFDM0U7QUFDRjsiLAogICJuYW1lcyI6IFsiaW5zZXJ0ZWQiLCAicG1SYXciLCAicGxhY2VzTWF4IiwgImR1cCIsICJqb3VyIiwgImNyZW5lYXUiLCAiaGV1cmUiLCAiZGF0ZV9kZWJ1dCIsICJjIl0KfQo=
