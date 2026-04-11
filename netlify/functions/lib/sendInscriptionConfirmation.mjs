/**
 * Courriel transactionnel de confirmation d'inscription (API Resend).
 * Ne lance pas d'erreur : journalise et retourne { sent: boolean, ... }.
 */

const RESEND_URL = "https://api.resend.com/emails";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Libellé lisible du cours (aligné sur le sélecteur du site). */
export function buildCourseLabel(course) {
  if (!course) return "Non précisé";
  const parts = [course.nom || ""].filter(Boolean);
  const details = [];
  if (course.date_debut) details.push(course.date_debut);
  if (course.jour) details.push(course.jour);
  if (course.heure) details.push(course.heure);
  if (details.length) parts.push("(" + details.join(" - ") + ")");
  const out = parts.join(" ").trim();
  return out || "Votre cours";
}

/**
 * @param {{ to: string, courseLabel: string, participantNames?: string[], nom?: string }} opts
 * @returns {Promise<{ sent: boolean, reason?: string, id?: string }>}
 */
export async function sendInscriptionConfirmation({ to, courseLabel, participantNames, nom }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONFIRMATION_EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(
      "[sendInscriptionConfirmation] RESEND_API_KEY ou CONFIRMATION_EMAIL_FROM manquant — courriel non envoyé"
    );
    return { sent: false, reason: "not_configured" };
  }
  const addr = (to || "").trim();
  if (!addr || !addr.includes("@")) {
    console.warn("[sendInscriptionConfirmation] courriel destinataire invalide");
    return { sent: false, reason: "invalid_to" };
  }

  let names = Array.isArray(participantNames)
    ? participantNames.map((n) => String(n || "").trim()).filter(Boolean)
    : [];
  if (names.length === 0 && nom) {
    const one = String(nom).trim();
    if (one) names = [one];
  }
  if (names.length === 0) names = [""];

  const prenom = (names[0] || "").split(/\s+/)[0] || "Bonjour";
  const label = courseLabel || "votre cours";
  const plusieurs = names.length > 1;
  const listeTexte = names.filter(Boolean).join(", ");
  const listeHtml = names
    .filter(Boolean)
    .map((n) => `<li>${escapeHtml(n)}</li>`)
    .join("");

  const subject = "Votre demande d'inscription — Ateliers St-Elme";

  const corpsListeTexte = plusieurs
    ? `Personnes inscrites :\n${names.filter(Boolean).map((n) => "• " + n).join("\n")}\n\n`
    : "";

  const corpsListeHtml = plusieurs
    ? `<p>Personnes inscrites&nbsp;:</p><ul>${listeHtml}</ul>`
    : `<p><strong>${escapeHtml(names[0] || "Participant")}</strong></p>`;

  const phrasePlaces = plusieurs
    ? "Nous avons bien reçu votre demande d'inscription pour plusieurs personnes."
    : "Nous avons bien reçu votre demande d'inscription.";

  const text = `Bonjour ${prenom},

${phrasePlaces}
Cours : ${label}.

${corpsListeTexte}Votre demande a été envoyée avec succès. Nous vous contacterons dans les prochains jours pour confirmer ${plusieurs ? "les places" : "votre place"} et vous transmettre les informations de paiement.

— L'équipe des Ateliers St-Elme
https://atelierstelme.ca
Pour toute question : info@atelierstelme.ca`;

  const html = `<p>Bonjour ${escapeHtml(prenom)},</p>
<p>${phrasePlaces} Cours&nbsp;: <strong>${escapeHtml(label)}</strong>.</p>
${corpsListeHtml}
<p>Votre demande a été envoyée avec succès. Nous vous contacterons dans les prochains jours pour confirmer ${plusieurs ? "les places" : "votre place"} et vous transmettre les informations de paiement.</p>
<p>— L'équipe des Ateliers St-Elme</p>
<p><a href="https://atelierstelme.ca">atelierstelme.ca</a> — <a href="mailto:info@atelierstelme.ca">info@atelierstelme.ca</a></p>`;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [addr],
        subject,
        text,
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[sendInscriptionConfirmation] Resend error:", res.status, data);
      return { sent: false, reason: "api_error", status: res.status, data };
    }
    console.log("[sendInscriptionConfirmation] envoyé à", addr, listeTexte || prenom);
    return { sent: true, id: data.id };
  } catch (e) {
    console.error("[sendInscriptionConfirmation] fetch error:", e);
    return { sent: false, reason: "fetch_error", error: e.message };
  }
}
