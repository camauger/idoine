/**
 * Lance `npx netlify dev` avec cwd = racine du dépôt (là où se trouvent netlify.toml et dist/).
 * Évite de lancer Netlify depuis backend/ ou un sous-dossier, ce qui mélange les chemins.
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
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
