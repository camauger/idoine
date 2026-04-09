/**
 * Supprime le cache Deno interne du Netlify CLI (souvent corrompu sous Windows → ETXTBSY).
 * Usage : node scripts/reset-netlify-deno-cache.js
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const dir = path.join(os.homedir(), ".config", "netlify", "deno-cli");
try {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("Supprimé :", dir);
} catch (e) {
  if (e.code !== "ENOENT") console.error(e.message);
}
