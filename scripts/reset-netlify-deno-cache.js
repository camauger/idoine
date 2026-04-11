/**
 * Supprime le cache Deno interne du Netlify CLI (Windows : EBUSY / ETXTBSY sur deno.exe).
 * Le CLI peut utiliser soit ~/.config/netlify/deno-cli, soit %APPDATA%\netlify\Config\deno-cli.
 * Usage : node scripts/reset-netlify-deno-cache.js
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const dirs = [
  path.join(os.homedir(), ".config", "netlify", "deno-cli"),
];

if (process.platform === "win32" && process.env.APPDATA) {
  dirs.push(
    path.join(process.env.APPDATA, "netlify", "Config", "deno-cli")
  );
}

for (const dir of dirs) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("Supprimé :", dir);
  } catch (e) {
    if (e.code !== "ENOENT") console.error(dir, "→", e.message);
  }
}
