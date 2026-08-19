/**
 * Courriels transactionnels d'inscription (API Postmark).
 * Ne lance pas d'erreur : journalise et retourne { sent: boolean, ... }.
 *
 * Deux envois distincts :
 *  - sendInscriptionConfirmation → à la personne inscrite. C'est LA pièce qui
 *    évite les re-soumissions : sans accusé de réception, les gens doutent et
 *    refont le formulaire des heures ou des jours plus tard.
 *  - sendInscriptionNotification → à l'atelier, en remplacement de la
 *    notification Netlify Forms qui partait à chaque soumission, doublons compris.
 *
 * Variables d'environnement (Netlify > Site settings > Environment variables) :
 *   POSTMARK_SERVER_TOKEN    (requis) jeton de serveur Postmark
 *   CONFIRMATION_EMAIL_FROM  (requis) expéditeur, doit être une Sender Signature
 *                            vérifiée chez Postmark, ex. Ateliers St-Elme <inscription@atelierstelme.ca>
 *   NOTIFICATION_EMAIL_TO    destinataire(s) internes, séparés par des virgules
 *   NOTIFICATION_EMAIL_FROM  optionnel, à défaut CONFIRMATION_EMAIL_FROM
 *   POSTMARK_MESSAGE_STREAM  optionnel, défaut "outbound" (flux transactionnel).
 *                            Une infolettre exigerait un flux "broadcast" séparé :
 *                            Postmark refuse de mélanger les deux.
 */

const POSTMARK_URL = "https://api.postmarkapp.com/email";

/** Extrait l'adresse seule de « Nom <adresse@exemple.ca> » pour comparaison. */
function adresseSeule(valeur) {
  const s = String(valeur || "").trim();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

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
  const from = process.env.CONFIRMATION_EMAIL_FROM;
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

  return envoyerCourriel({
    from,
    to: [addr],
    subject,
    text,
    html,
    // Une personne qui doute répond à ce courriel : la réponse doit arriver dans
    // la boîte surveillée, pas sur l'adresse d'envoi.
    replyTo: (process.env.NOTIFICATION_EMAIL_TO || "info@atelierstelme.ca").split(",")[0].trim(),
    contexte: "sendInscriptionConfirmation",
  });
}

/**
 * Envoi bas niveau via l'API Postmark. Ne lance jamais d'erreur : l'inscription
 * est déjà enregistrée quand on arrive ici, un échec d'envoi ne doit pas la
 * faire échouer. Les problèmes sont journalisés en console.error afin d'être
 * visibles dans les logs de fonctions Netlify.
 */
async function envoyerCourriel({ from, to, subject, text, html, replyTo, contexte }) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const destinataires = (Array.isArray(to) ? to : [to]).map((a) => String(a || "").trim()).filter(Boolean);

  if (!token || !from) {
    // console.error et non warn : tant que ce message apparaît, personne ne reçoit
    // rien — ni la personne inscrite, ni l'atelier.
    console.error(
      `[${contexte}] POSTMARK_SERVER_TOKEN ou CONFIRMATION_EMAIL_FROM manquant — AUCUN courriel envoyé`
    );
    return { sent: false, reason: "not_configured" };
  }
  if (destinataires.length === 0 || !destinataires.every((a) => a.includes("@"))) {
    console.error(`[${contexte}] destinataire invalide :`, destinataires);
    return { sent: false, reason: "invalid_to" };
  }

  const payload = {
    From: from,
    To: destinataires.join(","),
    Subject: subject,
    TextBody: text,
    HtmlBody: html,
    // Flux transactionnel. Une infolettre devrait passer par un flux
    // "broadcast" distinct : Postmark refuse de mélanger les deux.
    MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
  };
  // ReplyTo inutile s'il désigne déjà l'expéditeur : les réponses y vont d'office.
  if (replyTo && adresseSeule(replyTo) !== adresseSeule(from)) payload.ReplyTo = replyTo;

  try {
    const res = await fetch(POSTMARK_URL, {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Postmark renvoie un ErrorCode métier en plus du statut HTTP
      // (ex. 300 = expéditeur non vérifié, 406 = destinataire inactif).
      console.error(`[${contexte}] Postmark error:`, res.status, data.ErrorCode, data.Message || data);
      return { sent: false, reason: "api_error", status: res.status, errorCode: data.ErrorCode, data };
    }
    console.log(`[${contexte}] envoyé à`, destinataires.join(", "), "— MessageID", data.MessageID);
    return { sent: true, id: data.MessageID };
  } catch (e) {
    console.error(`[${contexte}] fetch error:`, e);
    return { sent: false, reason: "fetch_error", error: e.message };
  }
}

/**
 * Notification interne à l'atelier — remplace la notification automatique de
 * Netlify Forms, qui partait à CHAQUE soumission y compris les re-soumissions.
 * Appelée seulement quand au moins une inscription a réellement été créée.
 *
 * @param {{
 *   courseLabel: string,
 *   participants: Array<{ nom: string, enfant: string|null }>,
 *   courriel: string, telephone?: string,
 *   estMembre?: boolean, propreArgile?: string|null,
 *   newsletter?: boolean, message?: string|null,
 *   ignores?: Array<{ nom: string, enfant: string|null }>
 * }} opts
 */
export async function sendInscriptionNotification({
  courseLabel,
  participants,
  courriel,
  telephone,
  estMembre,
  propreArgile,
  newsletter,
  message,
  ignores,
  statut,
}) {
  const from = process.env.NOTIFICATION_EMAIL_FROM || process.env.CONFIRMATION_EMAIL_FROM;
  const to = (process.env.NOTIFICATION_EMAIL_TO || "info@atelierstelme.ca")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  if (to.length === 0) return { sent: false, reason: "no_recipient" };

  const liste = (participants || []).map((p) => (p.enfant ? `${p.nom} — enfant : ${p.enfant}` : p.nom));
  const nb = liste.length;
  const label = courseLabel || "Non précisé";
  const complet = statut === "cours_complet";
  const entete = complet
    ? "DEMANDE NON ENREGISTRÉE — COURS COMPLET"
    : "Nouvelle inscription";

  const lignes = [];
  if (complet) lignes.push(entete, "");
  lignes.push(
    `Cours : ${label}`,
    complet ? `Places demandées : ${nb} — refusées, cours complet` : `Nombre de places : ${nb}`,
    "",
    "Participants :",
    ...liste.map((l) => "• " + l),
    "",
    `Courriel : ${courriel || "—"}`,
    `Téléphone : ${telephone || "—"}`,
    `Membre de l'atelier : ${estMembre ? "oui" : "non"}`
  );
  if (propreArgile) lignes.push(`Apporte sa propre argile : ${propreArgile}`);
  lignes.push(`Infolettre : ${newsletter ? "oui" : "non"}`);
  if (message) lignes.push("", "Message :", message);
  if (ignores && ignores.length > 0) {
    lignes.push(
      "",
      "⚠ Personnes déjà inscrites à ce cours, ignorées (re-soumission) :",
      ...ignores.map((p) => "• " + (p.enfant ? `${p.nom} — enfant : ${p.enfant}` : p.nom))
    );
  }
  const text = lignes.join("\n");

  const html = `<h2>${escapeHtml(entete)}</h2>
<p><strong>Cours&nbsp;:</strong> ${escapeHtml(label)}<br>
<strong>${complet ? "Places demandées" : "Nombre de places"}&nbsp;:</strong> ${nb}${
    complet ? " — refusées, cours complet" : ""
  }</p>
<p><strong>Participants&nbsp;:</strong></p>
<ul>${liste.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
<p><strong>Courriel&nbsp;:</strong> <a href="mailto:${escapeHtml(courriel || "")}">${escapeHtml(courriel || "—")}</a><br>
<strong>Téléphone&nbsp;:</strong> ${escapeHtml(telephone || "—")}<br>
<strong>Membre de l'atelier&nbsp;:</strong> ${estMembre ? "oui" : "non"}${
    propreArgile ? `<br><strong>Apporte sa propre argile&nbsp;:</strong> ${escapeHtml(propreArgile)}` : ""
  }<br>
<strong>Infolettre&nbsp;:</strong> ${newsletter ? "oui" : "non"}</p>
${message ? `<p><strong>Message&nbsp;:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` : ""}
${
  ignores && ignores.length > 0
    ? `<p><strong>⚠ Déjà inscrites à ce cours, ignorées (re-soumission)&nbsp;:</strong></p><ul>${ignores
        .map((p) => `<li>${escapeHtml(p.enfant ? `${p.nom} — enfant : ${p.enfant}` : p.nom)}</li>`)
        .join("")}</ul>`
    : ""
}`;

  return envoyerCourriel({
    from,
    to,
    subject: complet
      ? `Demande refusée, cours complet — ${label}`
      : `Nouvelle inscription — ${label} (${nb} place${nb > 1 ? "s" : ""})`,
    text,
    html,
    replyTo: courriel || undefined,
    contexte: "sendInscriptionNotification",
  });
}
