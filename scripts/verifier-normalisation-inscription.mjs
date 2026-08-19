/**
 * Vérifie que la normalisation JavaScript de submission-created.js et son
 * équivalent SQL produisent exactement la même clé de comparaison.
 *
 * Les deux DOIVENT rester synchronisés : la fonction Netlify calcule la clé des
 * participants entrants en JavaScript, et la compare aux lignes déjà en base dont
 * la clé est calculée en SQL. Une divergence laisserait passer des doublons.
 *
 * Usage : node scripts/verifier-normalisation-inscription.mjs
 * Requiert DATABASE_URL (variable d'environnement ou .env à la racine).
 */
import { readFileSync } from "fs";
import { createRequire } from "module";
import { neon } from "@neondatabase/serverless";

const require = createRequire(import.meta.url);
const { normaliserComparaison } = require("../netlify/functions/submission-created.js");

function chargerDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const ligne = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!ligne) throw new Error("DATABASE_URL introuvable (environnement ou .env)");
  return ligne.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

const sql = neon(chargerDatabaseUrl());

const ACCENTS_DE = "àâäáãåçéèêëíìîïñóòôöõúùûüýÿ";
const ACCENTS_VERS = "aaaaaaceeeeiiiinooooouuuuyy";

/** Échantillons de bord, en plus de tout ce qui est réellement en base. */
const ECHANTILLONS = [
  "Magalie Marcoux (12 ans)",
  "MAgalie MArcoux",
  "magalie marcoux 12 ans",
  "Zoé Lavoie 11 ans",
  "zoe lavoie",
  "ZOÉ LAVOIE",
  "Léa",
  "Lea",
  "Thomas",
  "Jean-François Côté",
  "jean francois cote",
  "Anne-Marie  O'Neil",
  "  espaces  multiples  ",
  "Élodie (6 ans)",
  "élodie",
  "",
];

const enBase = await sql`
  SELECT DISTINCT v FROM (
    SELECT nom AS v FROM inscriptions
    UNION SELECT enfant FROM inscriptions
  ) t WHERE v IS NOT NULL
`;

const valeurs = [...new Set([...ECHANTILLONS, ...enBase.map((r) => r.v)])];

const cotesSql = await sql`
  SELECT v,
         regexp_replace(
           regexp_replace(
             translate(lower(coalesce(v, '')), ${ACCENTS_DE}, ${ACCENTS_VERS}),
             '\\(.*?\\)|[0-9]+\\s*ans?|[0-9]+', ' ', 'g'),
           '[^a-z]', '', 'g') AS cle
  FROM UNNEST(${valeurs}::text[]) AS t(v)
`;

let divergences = 0;
for (const { v, cle } of cotesSql) {
  const cleJs = normaliserComparaison(v);
  if (cleJs !== cle) {
    divergences++;
    console.error(`DIVERGENCE ${JSON.stringify(v)} : JS=${JSON.stringify(cleJs)} SQL=${JSON.stringify(cle)}`);
  }
}

console.log(`${valeurs.length} valeurs comparées (${ECHANTILLONS.length} échantillons + base).`);
if (divergences > 0) {
  console.error(`ÉCHEC : ${divergences} divergence(s) entre la normalisation JS et SQL.`);
  process.exit(1);
}
console.log("OK : les normalisations JavaScript et SQL concordent.");
