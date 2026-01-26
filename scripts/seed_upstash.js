// scripts/seed_upstash.js
// Sube TODOS los .json (root + carpetas) en 1 corrida, preservando esquema:
// - Root: keys fijas (como tu PS1)
// - Carpetas: cidef:<folder>:v1:<ruta_relativa_sin_ext_con_:>
// Requisitos: Node 18+ (fetch nativo)

const fs = require("fs/promises");
const path = require("path");

// Acepta ambos nombres (por compatibilidad con tu PS1 y con Upstash estándar)
const BASE_URL =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_KV_REST_API_URL;

const TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_KV_REST_API_TOKEN;

if (!BASE_URL || !TOKEN) {
  console.error("Faltan env vars: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (o KV_REST_API_URL + KV_REST_API_TOKEN)");
  process.exit(1);
}

async function ping() {
  const r = await fetch(`${BASE_URL}/ping`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const txt = await r.text();
  if (!r.ok || !txt.includes("PONG")) {
    throw new Error(`Upstash no responde. Status=${r.status} Body=${txt}`);
  }
}

async function putKey(key, filePath) {
  const raw = await fs.readFile(filePath, "utf8");

  // Validación rápida: que sea JSON parseable (evita subir basura)
  try {
    JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON inválido: ${filePath} -> ${e.message}`);
  }

  const url = `${BASE_URL}/set/${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: raw,
  });

  const txt = await r.text();
  let j;
  try { j = JSON.parse(txt); } catch { j = null; }

  if (!r.ok || !j || j.result !== "OK") {
    throw new Error(`ERROR SET ${key}\nStatus=${r.status}\nBody=${txt}`);
  }

  process.stdout.write(`OK  ${key}\n`);
}

async function listJsonRecursive(dir) {
  const out = [];
  async function walk(p) {
    const items = await fs.readdir(p, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(p, it.name);
      if (it.isDirectory()) await walk(full);
      else if (it.isFile() && it.name.toLowerCase().endsWith(".json")) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

function slugFromRelative(relNoExt) {
  // "sub/archivo" -> "sub:archivo"
  return relNoExt.split(path.sep).join(":").toLowerCase();
}

(async () => {
  const root = process.cwd();

  await ping();

  // === ROOT (como tu PS1) ===
  const rootFiles = [
    ["cidef:keymap:v1", "keymap_v1.json"],
    ["cidef:event_log:v1", "event_log.json"],
    ["cidef:user_events:v1", "user_events.json"],
    ["cidef:user_state:v1", "user_state.json"],
    ["cidef:router:v1", "router_config_v1.json"],
  ];

  for (const [key, rel] of rootFiles) {
    const fp = path.join(root, rel);
    await putKey(key, fp);
  }

  // === CARPETAS (sube TODOS los .json, recursivo) ===
  const folders = ["mitos", "fichas", "Capa_comercial", "capa_clientes"];

  for (const folder of folders) {
    const folderPath = path.join(root, folder);
    const files = await listJsonRecursive(folderPath);

    for (const fp of files) {
      const rel = path.relative(folderPath, fp);            // ej: "sub/a.json"
      const relNoExt = rel.replace(/\.json$/i, "");         // "sub/a"
      const name = slugFromRelative(relNoExt);              // "sub:a"

      const key = `cidef:${folder.toLowerCase()}:v1:${name}`;
      await putKey(key, fp);
    }
  }

  console.log("== SEED COMPLETO ==");
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
