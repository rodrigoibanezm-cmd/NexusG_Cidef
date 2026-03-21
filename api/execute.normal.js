// PATH: api/execute.normal.js

import { kv } from "@vercel/kv";

/* =========================
   Resolver por topic
   ========================= */

const RESOLVER_KEYS = {
  ficha: "cidef:resolver:ficha:v1",
  comercial: "cidef:resolver:comercial:v1",
  cliente: "cidef:resolver:cliente:v1",
  mitos: "cidef:resolver:mitos:v1",
};

/* =========================
   Prefijos reales por topic
   ========================= */

const TOPIC_PREFIX = {
  ficha: "cidef:fichas:v1",
  comercial: "cidef:comercial:v1",
  cliente: "cidef:clientes:v1",
  mitos: "cidef:mitos:v1",
};

/* =========================
   Normalizador
   ========================= */

function normalizeModel(label) {
  if (!label || typeof label !== "string") return null;

  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

/* =========================
   Execute Normal (final)
   ========================= */

export default async function executeNormal(body) {
  const { trace_id = null, topic, models = [] } = body || {};

  // Validación
  if (!topic || !RESOLVER_KEYS[topic] || !Array.isArray(models)) {
    return { error: "INVALID_INPUT" };
  }

  // Resolver + prefijo
  const resolverKey = RESOLVER_KEYS[topic];
  const basePrefix = TOPIC_PREFIX[topic];

  const resolver = await kv.get(resolverKey);

  // Caso especial mitos
  const targets =
    topic === "mitos" && models.length === 0
      ? Object.keys(resolver || {})
      : models;

  const data = [];

  for (const raw of targets) {
    const canonical = normalizeModel(raw);

    let payload = null;

    if (canonical && resolver) {
      const resolved = resolver[canonical];

      if (resolved) {
        const kvKey = `${basePrefix}:${resolved}`;
        payload = await kv.get(kvKey);
      }
    }

    data.push({
      modelo: raw,
      payload,
    });
  }

  return {
    trace_id,
    topic,
    data,
  };
}
