/**
 * Contourne la boucle EBUSY du Netlify CLI sous Windows.
 *
 * @netlify/edge-bundler n'écrit version.txt qu'après un deno --version réussi.
 * Si ce test échoue (EBUSY juste après extraction), le fichier n'existe pas : au
 * prochain `netlify dev`, Deno est retéléchargé → extraction → EBUSY à l'infini.
 * Quand deno.exe est déjà présent et finit par être exécutable, on écrit
 * version.txt pour activer getCachedBinary() et supprimer les retéléchargements.
 *
 * Usage : node scripts/ensure-netlify-deno-version-file.js
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

function netlifyDenoCacheDir() {
  if (process.platform === "win32" && process.env.APPDATA) {
    return path.join(process.env.APPDATA, "netlify", "Config", "deno-cli");
  }
  return path.join(os.homedir(), ".config", "netlify", "deno-cli");
}

function sleepBusy(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* attente synchrone sans dépendance */
  }
}

function ensureNetlifyDenoVersionFile() {
  const dir = netlifyDenoCacheDir();
  const ext = process.platform === "win32" ? ".exe" : "";
  const bin = path.join(dir, `deno${ext}`);
  const versionFile = path.join(dir, "version.txt");

  if (!fs.existsSync(bin)) {
    return { ok: false, reason: "no_binary" };
  }

  if (fs.existsSync(versionFile)) {
    try {
      const v = fs.readFileSync(versionFile, "utf8").trim();
      if (/^\d+\.\d+\.\d+/.test(v)) {
        return { ok: true, reason: "already_cached", version: v };
      }
    } catch (_) {
      /* réécrire */
    }
  }

  for (let i = 0; i < 40; i++) {
    const r = spawnSync(bin, ["--version"], {
      encoding: "utf8",
      timeout: 20000,
    });
    if (r.status === 0 && r.stdout) {
      const m = r.stdout.match(/deno ([\d.]+)/);
      if (m) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(versionFile, m[1], "utf8");
        } catch (e) {
          return { ok: false, reason: "write_failed", error: e.message };
        }
        return { ok: true, reason: "written", version: m[1] };
      }
    }
    sleepBusy(250);
  }

  return { ok: false, reason: "deno_version_timeout" };
}

function main() {
  const r = ensureNetlifyDenoVersionFile();
  if (r.ok) {
    if (r.reason === "written") {
      console.log("Netlify Deno : version.txt écrit (" + r.version + ") → cache actif.");
    }
  } else if (r.reason === "no_binary") {
    console.log("Netlify Deno : aucun binaire dans le cache (normal après reset).");
  } else {
    console.warn("Netlify Deno : impossible de stabiliser le cache :", r.reason, r.error || "");
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { ensureNetlifyDenoVersionFile, netlifyDenoCacheDir };
