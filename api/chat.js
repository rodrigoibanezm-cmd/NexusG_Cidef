export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);

  const user_id = body?.user_id;
  const text = body?.text;
  if (!user_id || !text) return res.status(400).json({ error: "missing user_id or text" });

  const UPS_URL = process.env.KV_REST_API_URL;
  const UPS_TOKEN = process.env.KV_REST_API_TOKEN;
  if (!UPS_URL || !UPS_TOKEN) return res.status(500).json({ error: "missing KV env vars" });

  async function getRaw(key) {
    const r = await fetch(`${UPS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPS_TOKEN}` }
    });
    const j = await r.json();
    return j?.result ?? null;
  }

  async function getJson(key) {
    const raw = await getRaw(key);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  }

  // 1) Cargar manifest (fuente de verdad de rutas)
  const manifestKey = "cidef:manifest:v1";
  const manifest = await getJson(manifestKey);
  if (!manifest) return res.status(500).json({ error: "manifest not found", manifestKey });

  // 2) Construir lista de keys reales desde el manifest (sin adivinar)
  const keys = [];

  // core
  if (manifest.core?.manifest) keys.push(manifest.core.manifest);
  if (manifest.core?.router_config) keys.push(manifest.core.router_config);
  if (manifest.core?.event_log) keys.push(manifest.core.event_log);

  // mitos
  if (manifest.layers?.mitos) {
    for (const k of Object.values(manifest.layers.mitos)) keys.push(k);
  }

  // capas por modelo (ft/comercial/cliente)
  for (const layerName of ["ft", "comercial", "cliente"]) {
    const layer = manifest.layers?.[layerName];
    if (!layer) continue;
    for (const k of Object.values(layer)) keys.push(k);
  }

  // quitar duplicados
  const uniqKeys = [...new Set(keys)].filter(Boolean);

  // 3) Traer todo en paralelo
  const out = {};
  await Promise.all(
    uniqKeys.map(async (k) => {
      out[k] = await getJson(k);
    })
  );

  return res.status(200).json({
    user_id,
    input: text,
    manifest_key: manifestKey,
    keys_count: uniqKeys.length,
    context_by_key: out
  });
}
