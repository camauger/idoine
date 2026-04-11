/**
 * Lance `npx netlify dev` avec cwd = racine du dépôt (là où se trouvent netlify.toml et dist/).
 * Évite de lancer Netlify depuis backend/ ou un sous-dossier, ce qui mélange les chemins.
 * Avant le CLI : stabilise le cache Deno (version.txt) pour éviter la boucle EBUSY sous Windows.
 */
const { spawn } = require("child_process");
const path = require("path");
const { ensureNetlifyDenoVersionFile } = require("./ensure-netlify-deno-version-file.js");

const root = path.resolve(__dirname, "..");

ensureNetlifyDenoVersionFile();
const shell = process.platform === "win32";
const child = spawn("npx", ["netlify", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
