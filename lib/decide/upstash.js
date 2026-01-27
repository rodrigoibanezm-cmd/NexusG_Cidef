// PATH: /lib/decide/upstash.js
// LINES: ~55
const URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;

const TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

export async function upstashGetJson(key) {
  if (!URL || !TOKEN) throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");

  const r = await fetch(`${URL}/get/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!r.ok) throw new Error(`Upstash HTTP ${r.status}`);

  const j = await r.json();
  const raw = j?.result ?? null;
  if (raw == null) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function unwrapMap(payload, mapKey) {
  if (payload == null) return null;

  // Soporta:
  // 1) array root: [...]
  // 2) objeto con propiedad exacta: { "mapa:cliente:light": [...] }
  // 3) objeto que ya es entry único: { modelo, ... }
  if (Array.isArray(payload)) return payload;

  if (typeof payload === "object" && Array.isArray(payload[mapKey])) return payload[mapKey];

  // si viene un único objeto-modelo, lo envolvemos
  if (typeof payload === "object" && payload.modelo) return [payload];

  return null;
}
