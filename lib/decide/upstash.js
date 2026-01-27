// PATH: /lib/decide/upstash.js
// LINES: ~70

export async function upstashGetJson(key) {
  const URL =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;

  const TOKEN =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!URL || !TOKEN) {
    throw new Error("Missing KV_REST_API_URL/KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN)");
  }

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

  if (Array.isArray(payload)) return payload;

  if (typeof payload === "object" && Array.isArray(payload[mapKey])) {
    return payload[mapKey];
  }

  if (typeof payload === "object" && payload.modelo) {
    return [payload];
  }

  return null;
}
