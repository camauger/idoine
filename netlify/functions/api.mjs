/**
 * Netlify Function: API cours + inscriptions (Neon DB)
 * Réplique le comportement du backend FastAPI pour le front vanilla.
 * Routes: GET /api/cours, GET /api/cours/:slug, POST /api/inscriptions
 */
import { neon } from "@neondatabase/serverless";

function corsHeaders(req) {
  const origin = req.headers.get("origin");
  const ok = origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
  if (!ok) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status = 200, req = null) {
  const headers = { "Content-Type": "application/json", ...(req ? corsHeaders(req) : {}) };
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
        enfant = null,
        jour_prefere = null,
        horaire_prefere = null,
        message = null,
        newsletter = false,
      } = body;

      if (!nom || !courriel || !telephone) {
        return errorResponse("nom, courriel et telephone requis", 400, req);
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
      if (count >= (course.places_max || 0)) {
        return errorResponse("Ce cours est complet.", 400, req);
      }

      const insert = await sql`
        INSERT INTO inscriptions (course_id, nom, courriel, telephone, enfant, jour_prefere, horaire_prefere, message, newsletter)
        VALUES (${course.id}, ${nom}, ${courriel}, ${telephone}, ${enfant}, ${jour_prefere}, ${horaire_prefere}, ${message}, ${newsletter})
        RETURNING id, course_id, nom, courriel, telephone, enfant, jour_prefere, horaire_prefere, message, newsletter, created_at
      `;
      const ins = (insert && insert[0]) || {};
      return jsonResponse(
        { ...ins, course_nom: course.nom },
        201,
        req
      );
    }

    return errorResponse("Not Found", 404, req);
  } catch (err) {
    console.error("API error:", err);
    return jsonResponse({ detail: err.message || "Erreur serveur" }, 500, req);
  }
};
