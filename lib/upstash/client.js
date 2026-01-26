// PATH: lib/upstash/client.js
// Upstash Redis REST client (ESM). JSON-first helpers.

function getEnv() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("missing KV env vars");
  }
  return { url, token };
}

async function upsFetch(path, { method = "GET", body } = {}) {
  const { url, token } = getEnv();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);

  try {
    const resp = await fetch(`${url}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = json?.error || `upstash_error_${resp.status}`;
      throw new Error(msg);
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

export async function getRaw(key) {
  const k = encodeURIComponent(key);
  const data = await upsFetch(`/get/${k}`);
  return data?.result ?? null;
}

export async function getJson(key) {
  const raw = await getRaw(key);
  if (raw == null) return null;
  if (typeof raw === "object") return raw; // Upstash might already return an object
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // leave as string if not JSON
  }
}

export async function mgetRaw(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return [];
  const path = `/mget/${keys.map((k) => encodeURIComponent(k)).join("/")}`;
  const data = await upsFetch(path);
  return Array.isArray(data?.result) ? data.result : [];
}

export async function mgetJson(keys) {
  const raws = await mgetRaw(keys);
  return raws.map((raw) => {
    if (raw == null) return null;
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  });
}

export async function rpushJson(listKey, obj) {
  const payload = JSON.stringify(obj);
  const k = encodeURIComponent(listKey);
  const v = encodeURIComponent(payload);
  const data = await upsFetch(`/rpush/${k}/${v}`);
  return data?.result ?? null; // typically new length
}
