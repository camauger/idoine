/**
 * Netlify Function: API cours + inscriptions + admin (Neon DB)
 * Réplique le comportement du backend FastAPI pour le front vanilla.
 * Routes: 
 *   GET /api/cours, GET /api/cours/:slug
 *   POST /api/admin/login, GET /api/admin/courses, POST /api/admin/courses,
 *   PUT /api/admin/courses/:id (partiel ou complet), DELETE /api/admin/courses/:id
 *   GET /api/admin/inscriptions, GET /api/admin/inscriptions/export
 */
import { neon } from "@neondatabase/serverless";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const SECRET_KEY = process.env.SECRET_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

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

function randomSlugSuffix() {
  return crypto.randomBytes(4).toString("hex");
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

    // ===== ADMIN ROUTES =====

    // POST /api/admin/login
    if (method === "POST" && pathname === "/api/admin/login") {
      if (!SECRET_KEY || !ADMIN_PASSWORD) {
        return errorResponse("Authentification non configurée", 500, req);
      }
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
      if (!SECRET_KEY || !ADMIN_PASSWORD) {
        return errorResponse("Authentification non configurée", 500, req);
      }
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

      // POST /api/admin/courses — création (corps aligné sur CourseCreate) ;
      // plusieurs créneaux : body.creneaux = [{ jour?, creneau?, heure?, places_max, date_debut? }, ...] (≥ 2)
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
          if (v === undefined || v === null) return null;
          const s = String(v).trim();
          return s === "" ? null : s;
        };
        const optInt = (v) => {
          if (v === undefined || v === null || v === "") return null;
          const n = parseInt(String(v), 10);
          return Number.isNaN(n) ? null : n;
        };

        const prix = optStr(body.prix);
        const prof = optStr(body.prof);
        const salle = optStr(body.salle);
        const description = optStr(body.description);
        const page_dediee = optStr(body.page_dediee);
        const image_url = optStr(body.image_url);
        const actif = body.actif === undefined ? true : !!body.actif;
        const badge_new = !!body.badge_new;
        const duree_semaines = optInt(body.duree_semaines);

        const creneaux = Array.isArray(body.creneaux) ? body.creneaux : null;
        const useMulti = creneaux && creneaux.length >= 2;

        if (useMulti) {
          const groupeSlug =
            optStr(body.groupe_slug) || `grp-${slugBase}-${randomSlugSuffix()}`;
          const inserted = [];
          for (let i = 0; i < creneaux.length; i++) {
            const slot = creneaux[i] || {};
            const pmRaw = slot.places_max;
            let placesMax = 6;
            if (pmRaw !== undefined && pmRaw !== null && String(pmRaw).trim() !== "") {
              const n =
                typeof pmRaw === "number" && Number.isFinite(pmRaw)
                  ? Math.trunc(pmRaw)
                  : parseInt(String(pmRaw), 10);
              if (Number.isNaN(n) || n < 0) {
                return errorResponse(`places_max invalide (créneau ${i + 1})`, 400, req);
              }
              placesMax = n;
            }
            let rowSlug = `${slugBase}-${i}`;
            let guard = 0;
            while (guard < 20) {
              const dup = await sql`SELECT id FROM courses WHERE slug = ${rowSlug} LIMIT 1`;
              if (!dup || !dup[0]) break;
              rowSlug = `${slugBase}-${i}-${randomSlugSuffix()}`;
              guard += 1;
            }
            if (guard >= 20) {
              return errorResponse("Impossible de générer un slug unique", 400, req);
            }

            const jour = optStr(slot.jour);
            const creneau = optStr(slot.creneau);
            const heure = optStr(slot.heure);
            const date_debut = optStr(slot.date_debut);

            const row = await sql`
              INSERT INTO courses (
                nom, slug, discipline, type_cours, jour, creneau, heure, duree_semaines,
                date_debut, places_max, prix, prof, salle, description, actif, badge_new,
                page_dediee, image_url, groupe_slug
              ) VALUES (
                ${nom}, ${rowSlug}, ${discipline}, ${type_cours},
                ${jour}, ${creneau}, ${heure}, ${duree_semaines},
                ${date_debut}, ${placesMax}, ${prix}, ${prof}, ${salle}, ${description},
                ${actif}, ${badge_new}, ${page_dediee}, ${image_url}, ${groupeSlug}
              )
              RETURNING *
            `;
            const c = row && row[0];
            if (!c) {
              return errorResponse("Échec de la création du cours", 500, req);
            }
            inserted.push({ ...c, places_restantes: Math.max(0, (c.places_max || 0) - 0) });
          }
          return jsonResponse({ groupe_slug: groupeSlug, courses: inserted }, 201, req);
        }

        const dup = await sql`SELECT id FROM courses WHERE slug = ${slugBase} LIMIT 1`;
        if (dup && dup[0]) {
          return errorResponse("Slug déjà utilisé", 400, req);
        }

        const pmRaw = body.places_max;
        let placesMax = 6;
        if (pmRaw !== undefined && pmRaw !== null && String(pmRaw).trim() !== "") {
          const n = typeof pmRaw === "number" && Number.isFinite(pmRaw) ? Math.trunc(pmRaw) : parseInt(String(pmRaw), 10);
          if (Number.isNaN(n) || n < 0) {
            return errorResponse("places_max invalide (entier ≥ 0)", 400, req);
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
          return errorResponse("Échec de la création du cours", 500, req);
        }
        const places_restantes = Math.max(0, (c.places_max || 0) - 0);
        return jsonResponse({ ...c, places_restantes }, 201, req);
      }

      // PUT /api/admin/courses/:id — mise à jour partielle (champs fournis uniquement)
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
        const optStrPatch = (v) => {
          if (v === undefined || v === null) return null;
          const s = String(v).trim();
          return s === "" ? null : s;
        };
        const optIntPatch = (v) => {
          if (v === undefined || v === null || v === "") return null;
          const n = parseInt(String(v), 10);
          return Number.isNaN(n) ? null : n;
        };

        const next = { ...cur };
        let touched = false;

        if (body.nom !== undefined) {
          touched = true;
          const s = String(body.nom ?? "").trim();
          if (!s) return errorResponse("Le nom ne peut pas être vide", 400, req);
          next.nom = s;
        }
        if (body.slug !== undefined) {
          touched = true;
          const s = String(body.slug ?? "").trim().toLowerCase();
          if (!s) return errorResponse("Le slug ne peut pas être vide", 400, req);
          next.slug = s;
        }
        if (body.discipline !== undefined) {
          touched = true;
          next.discipline = String(body.discipline ?? "ceramique").trim() || "ceramique";
        }
        if (body.type_cours !== undefined) {
          touched = true;
          next.type_cours = String(body.type_cours ?? "regulier").trim() || "regulier";
        }
        if (body.jour !== undefined) {
          touched = true;
          next.jour = optStrPatch(body.jour);
        }
        if (body.creneau !== undefined) {
          touched = true;
          next.creneau = optStrPatch(body.creneau);
        }
        if (body.heure !== undefined) {
          touched = true;
          next.heure = optStrPatch(body.heure);
        }
        if (body.duree_semaines !== undefined) {
          touched = true;
          next.duree_semaines = optIntPatch(body.duree_semaines);
        }
        if (body.date_debut !== undefined) {
          touched = true;
          next.date_debut = optStrPatch(body.date_debut);
        }
        if (body.places_max !== undefined) {
          touched = true;
          const pm = body.places_max;
          let n = cur.places_max ?? 0;
          if (pm !== undefined && pm !== null && String(pm).trim() !== "") {
            const parsed =
              typeof pm === "number" && Number.isFinite(pm) ? Math.trunc(pm) : parseInt(String(pm), 10);
            if (Number.isNaN(parsed) || parsed < 0) {
              return errorResponse("places_max invalide (entier ≥ 0)", 400, req);
            }
            n = parsed;
          }
          next.places_max = n;
        }
        if (body.prix !== undefined) {
          touched = true;
          next.prix = optStrPatch(body.prix);
        }
        if (body.prof !== undefined) {
          touched = true;
          next.prof = optStrPatch(body.prof);
        }
        if (body.salle !== undefined) {
          touched = true;
          next.salle = optStrPatch(body.salle);
        }
        if (body.description !== undefined) {
          touched = true;
          next.description = optStrPatch(body.description);
        }
        if (body.page_dediee !== undefined) {
          touched = true;
          next.page_dediee = optStrPatch(body.page_dediee);
        }
        if (body.image_url !== undefined) {
          touched = true;
          next.image_url = optStrPatch(body.image_url);
        }
        if (body.actif !== undefined) {
          touched = true;
          next.actif = !!body.actif;
        }
        if (body.badge_new !== undefined) {
          touched = true;
          next.badge_new = !!body.badge_new;
        }
        if (body.groupe_slug !== undefined) {
          touched = true;
          next.groupe_slug = optStrPatch(body.groupe_slug);
        }

        if (!touched) {
          return errorResponse("Aucun champ à mettre à jour", 400, req);
        }

        if (next.slug !== cur.slug) {
          const dup = await sql`SELECT id FROM courses WHERE slug = ${next.slug} AND id <> ${courseId} LIMIT 1`;
          if (dup && dup[0]) {
            return errorResponse("Slug déjà utilisé", 400, req);
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
        const count = (countRows && countRows[0] && countRows[0].cnt) || 0;
        const places_restantes = Math.max(0, (c.places_max || 0) - count);
        return jsonResponse({ ...c, places_restantes }, 200, req);
      }

      // DELETE /api/admin/courses/:id — supprime le créneau et les inscriptions associées
      const adminCourseDelete = pathname.match(/^\/api\/admin\/courses\/(\d+)$/);
      if (method === "DELETE" && adminCourseDelete) {
        const courseId = parseInt(adminCourseDelete[1], 10);
        const exists = await sql`SELECT id FROM courses WHERE id = ${courseId} LIMIT 1`;
        if (!exists || !exists[0]) {
          return errorResponse("Cours non trouvé", 404, req);
        }
        await sql`DELETE FROM inscriptions WHERE course_id = ${courseId}`;
        await sql`DELETE FROM courses WHERE id = ${courseId}`;
        return jsonResponse({ ok: true, id: courseId }, 200, req);
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
