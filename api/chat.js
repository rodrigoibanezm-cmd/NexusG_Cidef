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

  // Keys reales subidas (seed_report)
  const KEYS = [
    "cidef:manifest:v1",
    "cidef:keymap:v1",
    "cidef:router_config:v1",
    "cidef:event_log:v1",
    "cidef:user_events:v1",
    "cidef:user_state:v1",

    "cidef:mitos:v1:mitos_v1_china",
    "cidef:mitos:v1:mitos_v1_ev",
    "cidef:mitos:v1:mitos_v1_ev_china",

    "cidef:fichas:v1:ft_v1_t5",
    "cidef:fichas:v1:ft_v1_t5_evo",
    "cidef:fichas:v1:ft_v1_t5l",
    "cidef:fichas:v1:ft_v1_t5_evo_hev",
    "cidef:fichas:v1:ft_v1_foton_v9",
    "cidef:fichas:v1:ft_v1_s50_ev",

    "cidef:comercial:v1:comercial_v1_t5",
    "cidef:comercial:v1:comercial_v1_t5_evo",
    "cidef:comercial:v1:comercial_v1_t5l",
    "cidef:comercial:v1:comercial_v1_t5_evo_hev",
    "cidef:comercial:v1:comercial_v1_foton_v9",
    "cidef:comercial:v1:comercial_v1_s50_ev",
    "cidef:comercial:v1:comercial_v1_refs",

    "cidef:clientes:v1:cliente_v1_t5",
    "cidef:clientes:v1:cliente_v1_t5_evo",
    "cidef:clientes:v1:cliente_v1_t5l",
    "cidef:clientes:v1:cliente_v1_t5_evo_hev",
    "cidef:clientes:v1:cliente_v1_foton_v9",
    "cidef:clientes:v1:cliente_v1_s50_ev",
    "cidef:clientes:v1:cliente_v1_refs"
  ];

  const context_by_key = {};
  await Promise.all(
    KEYS.map(async (k) => {
      context_by_key[k] = await getJson(k);
    })
  );

  return res.status(200).json({
    user_id,
    input: text,
    keys_count: KEYS.length,
    keys: KEYS,
    context_by_key
  });
}
