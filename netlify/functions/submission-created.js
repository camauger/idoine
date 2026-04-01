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
    
    // Netlify sends: { payload: { form_name, data, ... } }
    // Handle both structures for safety
    const payload = body.payload || body;
    const form_name = payload.form_name || payload.form || body.form_name;
    const data = payload.data || payload;

    console.log('Received submission:', JSON.stringify({ form_name, data_keys: Object.keys(data || {}) }));

    // Only process "inscription" form submissions
    if (form_name !== 'inscription') {
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
    const coursValeur = data.cours || '';
    const message = data.message || null;
    const newsletter = data.newsletter === 'oui';
    const estMembre = data.est_membre === 'oui';

    // Parse the course value which may include date info
    // Format: "Course Name - date_debut (jour heure)" or just "Course Name"
    let coursNom = coursValeur;
    let coursDate = null;
    
    // Try to extract date from format "Name - date (details)"
    const dateMatch = coursValeur.match(/^(.+?)\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      coursNom = dateMatch[1].trim();
      coursDate = dateMatch[2];
    }

    console.log('Parsed course:', { coursNom, coursDate, original: coursValeur });

    // Find the course by name and date
    let courseId = null;
    
    if (coursDate) {
      // Try exact match with name and date
      const coursesExact = await sql`
        SELECT id FROM courses WHERE nom = ${coursNom} AND date_debut = ${coursDate} LIMIT 1
      `;
      if (coursesExact.length > 0) {
        courseId = coursesExact[0].id;
      }
    }
    
    if (!courseId) {
      // Fallback: try by name only
      const courses = await sql`
        SELECT id FROM courses WHERE nom = ${coursNom} LIMIT 1
      `;
      if (courses.length > 0) {
        courseId = courses[0].id;
      }
    }
    
    if (!courseId) {
      // Try partial match as last resort
      const coursesPartial = await sql`
        SELECT id FROM courses WHERE nom ILIKE ${'%' + coursNom + '%'} LIMIT 1
      `;
      if (coursesPartial.length > 0) {
        courseId = coursesPartial[0].id;
      }
    }

    if (!courseId) {
      console.error(`Course not found: ${coursNom}`);
      // Still insert with a default/null course_id if needed, or return error
      // For now, we'll log but not fail - the inscription is still in Netlify Forms
      return { 
        statusCode: 200, 
        body: `Warning: Course "${coursNom}" not found in database, inscription stored in Netlify Forms only` 
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
