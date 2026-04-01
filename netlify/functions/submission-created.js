/**
 * Netlify Function: submission-created
 * 
 * Triggered automatically when a Netlify Form receives a submission.
 * Syncs the inscription data to the Neon PostgreSQL database.
 */

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    
    // Netlify: { payload: { form_name, data: { ... } }, site: { ... } }
    const payload = body.payload || body;
    const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;

    const form_name =
      payload.form_name ||
      payload.form ||
      body.form_name ||
      (data && data['form-name']) ||
      (data && data.form_name);

    console.log('Received submission:', JSON.stringify({ form_name, data_keys: Object.keys(data || {}) }));

    // Formulaire "inscription" (nom du <form> ou champ caché form-name)
    const isInscription =
      form_name === 'inscription' ||
      (data && data['form-name'] === 'inscription') ||
      (data && data.form_name === 'inscription');
    if (!isInscription) {
      console.log(`Ignoring form: ${form_name}`);
      return { statusCode: 200, body: 'OK - form ignored' };
    }

    console.log('Processing inscription:', JSON.stringify(data));

    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('DATABASE_URL not configured');
      return { statusCode: 500, body: 'Database not configured' };
    }

    const sql = neon(databaseUrl);

    // Extract form data
    const nom = data.nom || '';
    const courriel = data.courriel || '';
    const telephone = data.telephone || '';
    const enfant = data.enfant || null;
    const coursValeur = (data.cours != null ? String(data.cours) : '').trim();
    const message = data.message || null;
    const newsletter = data.newsletter === 'oui';
    const estMembre = data.est_membre === 'oui';

    /**
     * Résout course_id depuis le champ « cours » du formulaire.
     * - Valeur numérique = id du cours (recommandé, envoyé par le select actuel).
     * - Ancienne valeur texte : « Nom du cours - 11 avril (samedi …) » → extraire nom + date_debut.
     */
    let courseId = null;

    if (/^\d+$/.test(coursValeur)) {
      const byId = await sql`SELECT id FROM courses WHERE id = ${parseInt(coursValeur, 10)} LIMIT 1`;
      if (byId.length > 0) courseId = byId[0].id;
    }

    if (!courseId && coursValeur) {
      const parts = coursValeur.split(' - ');
      const baseNom = parts[0].trim();
      const rest = parts.length > 1 ? parts.slice(1).join(' - ') : '';
      const dateSansParentheses = rest.replace(/\s*\([^)]*\)\s*$/, '').trim();

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

    console.log('Resolved course:', { courseId, coursValeur: coursValeur.slice(0, 120) });

    if (!courseId) {
      console.error('Course not found for cours field:', coursValeur);
      return {
        statusCode: 200,
        body: `Warning: cours introuvable en base (valeur: ${coursValeur.slice(0, 200)}). Inscription seulement dans Netlify Forms.`,
      };
    }

    const enfantStr = enfant || '';
    const dupCheck = await sql`
      SELECT id FROM inscriptions
      WHERE course_id = ${courseId}
        AND lower(trim(courriel)) = lower(trim(${courriel}))
        AND lower(trim(nom)) = lower(trim(${nom}))
        AND coalesce(trim(enfant), '') = coalesce(trim(${enfantStr}), '')
        AND created_at > now() - interval '15 minutes'
      LIMIT 1
    `;
    if (dupCheck && dupCheck.length > 0) {
      console.log('Duplicate inscription ignored (same cours + personne récente):', dupCheck[0].id);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, duplicate: true, inscription_id: dupCheck[0].id, course_id: courseId }),
      };
    }

    // Insert inscription into database
    const result = await sql`
      INSERT INTO inscriptions (course_id, nom, courriel, telephone, enfant, message, newsletter, est_membre, created_at)
      VALUES (${courseId}, ${nom}, ${courriel}, ${telephone}, ${enfant}, ${message}, ${newsletter}, ${estMembre}, NOW())
      RETURNING id
    `;

    console.log('Inscription created with ID:', result[0].id);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        inscription_id: result[0].id,
        course_id: courseId 
      })
    };

  } catch (error) {
    console.error('Error processing submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
