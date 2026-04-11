/**
 * Netlify Function: API cours + inscriptions + admin (Neon DB)
 * Réplique le comportement du backend FastAPI pour le front vanilla.
 * Routes: 
 *   GET /api/cours, GET /api/cours/:slug, POST /api/inscriptions
 *   POST /api/admin/login, GET /api/admin/courses, PUT /api/admin/courses/:id
 *   GET /api/admin/inscriptions, GET /api/admin/inscriptions/export
 */
import { neon } from "@neondatabase/serverless";
import jwt from "jsonwebtoken";
import {
  sendInscriptionConfirmation,
  buildCourseLabel,
} from "./lib/sendInscriptionConfirmation.mjs";

const SECRET_KEY = process.env.SECRET_KEY || "change-me-in-production";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const MAX_INSCRIPTION_PARTICIPANTS = 8;

function corsHeaders(req) {
  const origin = req.headers.get("origin");
  const ok = origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin.includes("netlify") || origin.includes("atelierstelme"));
  if (!ok) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    ...(req ? corsHeaders(req) : {}),
  };
  return new Response(JSON.stringify(data), { status, headers });
}

function errorResponse(message, status = 400, req = null) {
  return jsonResponse({ detail: message }, status, req);
}

export default async (req, context) => {
  const url = new URL(req.url);
  // Netlify rewrite envoie /.netlify/functions/api/:splat → normaliser en /api/...
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
    return jsonResponse({ detail: "DATABASE_URL non configurée" }, 500, req);
  }

  const sql = neon(databaseUrl);

  try {
    // GET /api/cours → liste des cours actifs avec places_restantes
    if (method === "GET" && (pathname === "/api/cours" || pathname === "/api/cours/")) {
      const actifOnly = url.searchParams.get("actif_only") !== "false";
      const courses = actifOnly
        ? await sql`SELECT * FROM courses WHERE actif = true ORDER BY discipline, type_cours, jour`
        : await sql`SELECT * FROM courses ORDER BY discipline, type_cours, jour`;
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

    // GET /api/cours/:slug ou :id
    const coursMatch = pathname.match(/^\/api\/cours\/(.+)$/);
    if (method === "GET" && coursMatch) {
      const slugOrId = decodeURIComponent(coursMatch[1]);
      const byId = /^\d+$/.test(slugOrId);
      const rows = byId
        ? await sql`SELECT * FROM courses WHERE id = ${parseInt(slugOrId, 10)}`
        : await sql`SELECT * FROM courses WHERE slug = ${slugOrId}`;
      const course = (rows && rows[0]) || null;
      if (!course) {
        return errorResponse("Cours non trouvé", 404, req);
      }
      const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM inscriptions WHERE course_id = ${course.id}`;
      const count = (countRows && countRows[0] && countRows[0].cnt) || 0;
      const places_restantes = Math.max(0, (course.places_max || 0) - count);
      const out = { ...course, places_restantes };
      return jsonResponse(out, 200, req);
    }

    // POST /api/inscriptions
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
        est_membre: estMembreBody,
      } = body;

      let participants = [];
      if (Array.isArray(participantsInput) && participantsInput.length > 0) {
        participants = participantsInput
          .map((p) => ({
            nom: String((p && p.nom) || "").trim(),
            enfant:
              p && p.enfant != null && String(p.enfant).trim()
                ? String(p.enfant).trim()
                : null,
          }))
          .filter((p) => p.nom);
      } else if (nom && String(nom).trim()) {
        participants = [
          {
            nom: String(nom).trim(),
            enfant: enfant != null && String(enfant).trim() ? String(enfant).trim() : null,
          },
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
        course = (rows && rows[0]) || null;
      }
      if (!course && coursNom) {
        const rows = await sql`SELECT * FROM courses WHERE nom = ${coursNom}`;
        course = (rows && rows[0]) || null;
      }
      if (!course) {
        return errorResponse("Cours non trouvé (course_id ou cours invalide)", 400, req);
      }

      const countRows = await sql`SELECT COUNT(*)::int AS cnt FROM inscriptions WHERE course_id = ${course.id}`;
      const count = (countRows && countRows[0] && countRows[0].cnt) || 0;
      if (count + participants.length > (course.places_max || 0)) {
        return errorResponse(
          "Ce cours est complet ou il ne reste pas assez de places pour ce nombre de personnes.",
          400,
          req
        );
      }

      const estMembreBool =
        estMembreBody === true || estMembreBody === "oui" || estMembreBody === "true";

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

      const createdAt = new Date();
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
        courseLabel,
      });
      return jsonResponse(
        {
          ...(firstRow || {}),
          inscription_ids: ids,
          count: ids.length,
          course_nom: course.nom,
        },
        201,
        req
      );
    }

    // ===== ADMIN ROUTES =====

    // POST /api/admin/login
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

    // Protected admin routes
    if (pathname.startsWith("/api/admin/")) {
      if (!verifyToken(req)) {
        return errorResponse("Non autorisé", 401, req);
      }

      // GET /api/admin/courses
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

      // PUT /api/admin/courses/:id — places_max et/ou actif (booléen)
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
          return errorResponse("Cours non trouvé", 404, req);
        }
        const cur = rows[0];
        const hasPlaces =
          body.places_max !== undefined && body.places_max !== null && String(body.places_max).trim() !== "";
        const hasActif = typeof body.actif === "boolean";
        if (!hasPlaces && !hasActif) {
          return errorResponse("Fournir places_max et/ou actif (booléen)", 400, req);
        }
        let nextPlaces = cur.places_max ?? 0;
        if (hasPlaces) {
          const pm = body.places_max;
          const n =
            typeof pm === "number" && Number.isFinite(pm) ? Math.trunc(pm) : parseInt(String(pm), 10);
          if (Number.isNaN(n) || n < 0) {
            return errorResponse("places_max invalide (entier ≥ 0)", 400, req);
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
        const count = (countRows && countRows[0] && countRows[0].cnt) || 0;
        const places_restantes = Math.max(0, (c.places_max || 0) - count);
        return jsonResponse({ ...c, places_restantes }, 200, req);
      }

      // GET /api/admin/inscriptions
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

      // GET /api/admin/inscriptions/export
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
        
        // Build CSV
        const rows = [["id", "date_inscription", "cours", "date_cours", "nom", "courriel", "telephone", "enfant", "message", "newsletter", "est_membre"]];
        for (const i of (inscriptions || [])) {
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
            i.est_membre ? "oui" : "non",
          ]);
        }
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=inscriptions.csv",
            ...corsHeaders(req),
          },
        });
      }
    }

    return errorResponse("Not Found", 404, req);
  } catch (err) {
    console.error("API error:", err);
    return jsonResponse({ detail: err.message || "Erreur serveur" }, 500, req);
  }
};
