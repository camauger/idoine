
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// ../netlify/functions/api.mjs
import { neon } from "@neondatabase/serverless";
function corsHeaders(req) {
  const origin = req.headers.get("origin");
  const ok = origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"));
  if (!ok)
    return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
function jsonResponse(data, status = 200, req = null) {
  const headers = { "Content-Type": "application/json", ...req ? corsHeaders(req) : {} };
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
        enfant = null,
        jour_prefere = null,
        horaire_prefere = null,
        message = null,
        newsletter = false
      } = body;
      if (!nom || !courriel || !telephone) {
        return errorResponse("nom, courriel et telephone requis", 400, req);
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
      if (count >= (course.places_max || 0)) {
        return errorResponse("Ce cours est complet.", 400, req);
      }
      const createdAt = /* @__PURE__ */ new Date();
      const insert = await sql`
        INSERT INTO inscriptions (course_id, nom, courriel, telephone, enfant, jour_prefere, horaire_prefere, message, newsletter, created_at)
        VALUES (${course.id}, ${nom}, ${courriel}, ${telephone}, ${enfant}, ${jour_prefere}, ${horaire_prefere}, ${message}, ${newsletter}, ${createdAt})
        RETURNING id, course_id, nom, courriel, telephone, enfant, jour_prefere, horaire_prefere, message, newsletter, created_at
      `;
      const ins = insert && insert[0] || {};
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
export {
  api_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbmV0bGlmeS9mdW5jdGlvbnMvYXBpLm1qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBOZXRsaWZ5IEZ1bmN0aW9uOiBBUEkgY291cnMgKyBpbnNjcmlwdGlvbnMgKE5lb24gREIpXG4gKiBSXHUwMEU5cGxpcXVlIGxlIGNvbXBvcnRlbWVudCBkdSBiYWNrZW5kIEZhc3RBUEkgcG91ciBsZSBmcm9udCB2YW5pbGxhLlxuICogUm91dGVzOiBHRVQgL2FwaS9jb3VycywgR0VUIC9hcGkvY291cnMvOnNsdWcsIFBPU1QgL2FwaS9pbnNjcmlwdGlvbnNcbiAqL1xuaW1wb3J0IHsgbmVvbiB9IGZyb20gXCJAbmVvbmRhdGFiYXNlL3NlcnZlcmxlc3NcIjtcblxuZnVuY3Rpb24gY29yc0hlYWRlcnMocmVxKSB7XG4gIGNvbnN0IG9yaWdpbiA9IHJlcS5oZWFkZXJzLmdldChcIm9yaWdpblwiKTtcbiAgY29uc3Qgb2sgPSBvcmlnaW4gJiYgKG9yaWdpbi5zdGFydHNXaXRoKFwiaHR0cDovL2xvY2FsaG9zdFwiKSB8fCBvcmlnaW4uc3RhcnRzV2l0aChcImh0dHA6Ly8xMjcuMC4wLjFcIikpO1xuICBpZiAoIW9rKSByZXR1cm4ge307XG4gIHJldHVybiB7XG4gICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogb3JpZ2luLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIkdFVCwgUE9TVCwgT1BUSU9OU1wiLFxuICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcIkNvbnRlbnQtVHlwZVwiLFxuICB9O1xufVxuXG5mdW5jdGlvbiBqc29uUmVzcG9uc2UoZGF0YSwgc3RhdHVzID0gMjAwLCByZXEgPSBudWxsKSB7XG4gIGNvbnN0IGhlYWRlcnMgPSB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLCAuLi4ocmVxID8gY29yc0hlYWRlcnMocmVxKSA6IHt9KSB9O1xuICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpLCB7IHN0YXR1cywgaGVhZGVycyB9KTtcbn1cblxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShtZXNzYWdlLCBzdGF0dXMgPSA0MDAsIHJlcSA9IG51bGwpIHtcbiAgcmV0dXJuIGpzb25SZXNwb25zZSh7IGRldGFpbDogbWVzc2FnZSB9LCBzdGF0dXMsIHJlcSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIChyZXEsIGNvbnRleHQpID0+IHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsKTtcbiAgLy8gTmV0bGlmeSByZXdyaXRlIGVudm9pZSAvLm5ldGxpZnkvZnVuY3Rpb25zL2FwaS86c3BsYXQgXHUyMTkyIG5vcm1hbGlzZXIgZW4gL2FwaS8uLi5cbiAgbGV0IHBhdGhuYW1lID0gdXJsLnBhdGhuYW1lO1xuICBpZiAocGF0aG5hbWUuc3RhcnRzV2l0aChcIi8ubmV0bGlmeS9mdW5jdGlvbnMvYXBpXCIpKSB7XG4gICAgcGF0aG5hbWUgPSBcIi9hcGlcIiArIHBhdGhuYW1lLnNsaWNlKFwiLy5uZXRsaWZ5L2Z1bmN0aW9ucy9hcGlcIi5sZW5ndGgpIHx8IFwiL2FwaVwiO1xuICB9XG4gIGNvbnN0IG1ldGhvZCA9IHJlcS5tZXRob2Q7XG5cbiAgaWYgKG1ldGhvZCA9PT0gXCJPUFRJT05TXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHsgc3RhdHVzOiAyMDQsIGhlYWRlcnM6IHsgLi4uY29yc0hlYWRlcnMocmVxKSwgXCJBY2Nlc3MtQ29udHJvbC1NYXgtQWdlXCI6IFwiODY0MDBcIiB9IH0pO1xuICB9XG5cbiAgY29uc3QgZGF0YWJhc2VVcmwgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwgfHwgcHJvY2Vzcy5lbnYuTkVUTElGWV9EQVRBQkFTRV9VUkwgfHwgcHJvY2Vzcy5lbnYuTkVUTElGWV9EQVRBQkFTRV9VUkxfVU5QT09MRUQ7XG4gIGlmICghZGF0YWJhc2VVcmwpIHtcbiAgICByZXR1cm4ganNvblJlc3BvbnNlKHsgZGV0YWlsOiBcIkRBVEFCQVNFX1VSTCBub24gY29uZmlndXJcdTAwRTllXCIgfSwgNTAwLCByZXEpO1xuICB9XG5cbiAgY29uc3Qgc3FsID0gbmVvbihkYXRhYmFzZVVybCk7XG5cbiAgdHJ5IHtcbiAgICAvLyBHRVQgL2FwaS9jb3VycyBcdTIxOTIgbGlzdGUgZGVzIGNvdXJzIGFjdGlmcyBhdmVjIHBsYWNlc19yZXN0YW50ZXNcbiAgICBpZiAobWV0aG9kID09PSBcIkdFVFwiICYmIChwYXRobmFtZSA9PT0gXCIvYXBpL2NvdXJzXCIgfHwgcGF0aG5hbWUgPT09IFwiL2FwaS9jb3Vycy9cIikpIHtcbiAgICAgIGNvbnN0IGFjdGlmT25seSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwiYWN0aWZfb25seVwiKSAhPT0gXCJmYWxzZVwiO1xuICAgICAgY29uc3QgY291cnNlcyA9IGFjdGlmT25seVxuICAgICAgICA/IGF3YWl0IHNxbGBTRUxFQ1QgKiBGUk9NIGNvdXJzZXMgV0hFUkUgYWN0aWYgPSB0cnVlIE9SREVSIEJZIGRpc2NpcGxpbmUsIHR5cGVfY291cnMsIGpvdXJgXG4gICAgICAgIDogYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBPUkRFUiBCWSBkaXNjaXBsaW5lLCB0eXBlX2NvdXJzLCBqb3VyYDtcbiAgICAgIGNvbnN0IGNvdW50cyA9IGF3YWl0IHNxbGBcbiAgICAgICAgU0VMRUNUIGNvdXJzZV9pZCwgQ09VTlQoKik6OmludCBBUyBjbnRcbiAgICAgICAgRlJPTSBpbnNjcmlwdGlvbnNcbiAgICAgICAgR1JPVVAgQlkgY291cnNlX2lkXG4gICAgICBgO1xuICAgICAgY29uc3QgY291bnRCeUNvdXJzZSA9IE9iamVjdC5mcm9tRW50cmllcygoY291bnRzIHx8IFtdKS5tYXAoKHIpID0+IFtyLmNvdXJzZV9pZCwgci5jbnRdKSk7XG4gICAgICBjb25zdCByZXN1bHQgPSAoY291cnNlcyB8fCBbXSkubWFwKChjKSA9PiB7XG4gICAgICAgIGNvbnN0IGNvdW50ID0gY291bnRCeUNvdXJzZVtjLmlkXSB8fCAwO1xuICAgICAgICBjb25zdCBwbGFjZXNfcmVzdGFudGVzID0gTWF0aC5tYXgoMCwgKGMucGxhY2VzX21heCB8fCAwKSAtIGNvdW50KTtcbiAgICAgICAgcmV0dXJuIHsgLi4uYywgcGxhY2VzX3Jlc3RhbnRlcyB9O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4ganNvblJlc3BvbnNlKHJlc3VsdCwgMjAwLCByZXEpO1xuICAgIH1cblxuICAgIC8vIEdFVCAvYXBpL2NvdXJzLzpzbHVnIG91IDppZFxuICAgIGNvbnN0IGNvdXJzTWF0Y2ggPSBwYXRobmFtZS5tYXRjaCgvXlxcL2FwaVxcL2NvdXJzXFwvKC4rKSQvKTtcbiAgICBpZiAobWV0aG9kID09PSBcIkdFVFwiICYmIGNvdXJzTWF0Y2gpIHtcbiAgICAgIGNvbnN0IHNsdWdPcklkID0gZGVjb2RlVVJJQ29tcG9uZW50KGNvdXJzTWF0Y2hbMV0pO1xuICAgICAgY29uc3QgYnlJZCA9IC9eXFxkKyQvLnRlc3Qoc2x1Z09ySWQpO1xuICAgICAgY29uc3Qgcm93cyA9IGJ5SWRcbiAgICAgICAgPyBhd2FpdCBzcWxgU0VMRUNUICogRlJPTSBjb3Vyc2VzIFdIRVJFIGlkID0gJHtwYXJzZUludChzbHVnT3JJZCwgMTApfWBcbiAgICAgICAgOiBhd2FpdCBzcWxgU0VMRUNUICogRlJPTSBjb3Vyc2VzIFdIRVJFIHNsdWcgPSAke3NsdWdPcklkfWA7XG4gICAgICBjb25zdCBjb3Vyc2UgPSAocm93cyAmJiByb3dzWzBdKSB8fCBudWxsO1xuICAgICAgaWYgKCFjb3Vyc2UpIHtcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJDb3VycyBub24gdHJvdXZcdTAwRTlcIiwgNDA0LCByZXEpO1xuICAgICAgfVxuICAgICAgY29uc3QgY291bnRSb3dzID0gYXdhaXQgc3FsYFNFTEVDVCBDT1VOVCgqKTo6aW50IEFTIGNudCBGUk9NIGluc2NyaXB0aW9ucyBXSEVSRSBjb3Vyc2VfaWQgPSAke2NvdXJzZS5pZH1gO1xuICAgICAgY29uc3QgY291bnQgPSAoY291bnRSb3dzICYmIGNvdW50Um93c1swXSAmJiBjb3VudFJvd3NbMF0uY250KSB8fCAwO1xuICAgICAgY29uc3QgcGxhY2VzX3Jlc3RhbnRlcyA9IE1hdGgubWF4KDAsIChjb3Vyc2UucGxhY2VzX21heCB8fCAwKSAtIGNvdW50KTtcbiAgICAgIGNvbnN0IG91dCA9IHsgLi4uY291cnNlLCBwbGFjZXNfcmVzdGFudGVzIH07XG4gICAgICByZXR1cm4ganNvblJlc3BvbnNlKG91dCwgMjAwLCByZXEpO1xuICAgIH1cblxuICAgIC8vIFBPU1QgL2FwaS9pbnNjcmlwdGlvbnNcbiAgICBpZiAobWV0aG9kID09PSBcIlBPU1RcIiAmJiBwYXRobmFtZSA9PT0gXCIvYXBpL2luc2NyaXB0aW9uc1wiKSB7XG4gICAgICBsZXQgYm9keTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFwiQm9keSBKU09OIGludmFsaWRlXCIsIDQwMCwgcmVxKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgY291cnNlX2lkLFxuICAgICAgICBjb3VyczogY291cnNOb20sXG4gICAgICAgIG5vbSxcbiAgICAgICAgY291cnJpZWwsXG4gICAgICAgIHRlbGVwaG9uZSxcbiAgICAgICAgZW5mYW50ID0gbnVsbCxcbiAgICAgICAgam91cl9wcmVmZXJlID0gbnVsbCxcbiAgICAgICAgaG9yYWlyZV9wcmVmZXJlID0gbnVsbCxcbiAgICAgICAgbWVzc2FnZSA9IG51bGwsXG4gICAgICAgIG5ld3NsZXR0ZXIgPSBmYWxzZSxcbiAgICAgIH0gPSBib2R5O1xuXG4gICAgICBpZiAoIW5vbSB8fCAhY291cnJpZWwgfHwgIXRlbGVwaG9uZSkge1xuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIm5vbSwgY291cnJpZWwgZXQgdGVsZXBob25lIHJlcXVpc1wiLCA0MDAsIHJlcSk7XG4gICAgICB9XG5cbiAgICAgIGxldCBjb3Vyc2UgPSBudWxsO1xuICAgICAgaWYgKGNvdXJzZV9pZCkge1xuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBpZCA9ICR7Y291cnNlX2lkfWA7XG4gICAgICAgIGNvdXJzZSA9IChyb3dzICYmIHJvd3NbMF0pIHx8IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIWNvdXJzZSAmJiBjb3Vyc05vbSkge1xuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgc3FsYFNFTEVDVCAqIEZST00gY291cnNlcyBXSEVSRSBub20gPSAke2NvdXJzTm9tfWA7XG4gICAgICAgIGNvdXJzZSA9IChyb3dzICYmIHJvd3NbMF0pIHx8IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIWNvdXJzZSkge1xuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIkNvdXJzIG5vbiB0cm91dlx1MDBFOSAoY291cnNlX2lkIG91IGNvdXJzIGludmFsaWRlKVwiLCA0MDAsIHJlcSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvdW50Um93cyA9IGF3YWl0IHNxbGBTRUxFQ1QgQ09VTlQoKik6OmludCBBUyBjbnQgRlJPTSBpbnNjcmlwdGlvbnMgV0hFUkUgY291cnNlX2lkID0gJHtjb3Vyc2UuaWR9YDtcbiAgICAgIGNvbnN0IGNvdW50ID0gKGNvdW50Um93cyAmJiBjb3VudFJvd3NbMF0gJiYgY291bnRSb3dzWzBdLmNudCkgfHwgMDtcbiAgICAgIGlmIChjb3VudCA+PSAoY291cnNlLnBsYWNlc19tYXggfHwgMCkpIHtcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXCJDZSBjb3VycyBlc3QgY29tcGxldC5cIiwgNDAwLCByZXEpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjcmVhdGVkQXQgPSBuZXcgRGF0ZSgpO1xuICAgICAgY29uc3QgaW5zZXJ0ID0gYXdhaXQgc3FsYFxuICAgICAgICBJTlNFUlQgSU5UTyBpbnNjcmlwdGlvbnMgKGNvdXJzZV9pZCwgbm9tLCBjb3VycmllbCwgdGVsZXBob25lLCBlbmZhbnQsIGpvdXJfcHJlZmVyZSwgaG9yYWlyZV9wcmVmZXJlLCBtZXNzYWdlLCBuZXdzbGV0dGVyLCBjcmVhdGVkX2F0KVxuICAgICAgICBWQUxVRVMgKCR7Y291cnNlLmlkfSwgJHtub219LCAke2NvdXJyaWVsfSwgJHt0ZWxlcGhvbmV9LCAke2VuZmFudH0sICR7am91cl9wcmVmZXJlfSwgJHtob3JhaXJlX3ByZWZlcmV9LCAke21lc3NhZ2V9LCAke25ld3NsZXR0ZXJ9LCAke2NyZWF0ZWRBdH0pXG4gICAgICAgIFJFVFVSTklORyBpZCwgY291cnNlX2lkLCBub20sIGNvdXJyaWVsLCB0ZWxlcGhvbmUsIGVuZmFudCwgam91cl9wcmVmZXJlLCBob3JhaXJlX3ByZWZlcmUsIG1lc3NhZ2UsIG5ld3NsZXR0ZXIsIGNyZWF0ZWRfYXRcbiAgICAgIGA7XG4gICAgICBjb25zdCBpbnMgPSAoaW5zZXJ0ICYmIGluc2VydFswXSkgfHwge307XG4gICAgICByZXR1cm4ganNvblJlc3BvbnNlKFxuICAgICAgICB7IC4uLmlucywgY291cnNlX25vbTogY291cnNlLm5vbSB9LFxuICAgICAgICAyMDEsXG4gICAgICAgIHJlcVxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZShcIk5vdCBGb3VuZFwiLCA0MDQsIHJlcSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJBUEkgZXJyb3I6XCIsIGVycik7XG4gICAgcmV0dXJuIGpzb25SZXNwb25zZSh7IGRldGFpbDogZXJyLm1lc3NhZ2UgfHwgXCJFcnJldXIgc2VydmV1clwiIH0sIDUwMCwgcmVxKTtcbiAgfVxufTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFLQSxTQUFTLFlBQVk7QUFFckIsU0FBUyxZQUFZLEtBQUs7QUFD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
