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
   Normalizador (SE MANTIENE)
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
   Execute Normal (refactor)
   ========================= */

export default async function executeNormal(body) {
  const { trace_id = null, topic, models = [] } = body || {};

  // Validación básica
  if (!topic || !RESOLVER_KEYS[topic] || !Array.isArray(models)) {
    return { error: "INVALID_INPUT" };
  }

  // Cargar resolver desde KV
  const resolverKey = RESOLVER_KEYS[topic];
  const resolver = await kv.get(resolverKey);

  // Caso mitos sin models → traer todos los del resolver
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
        // Construcción dinámica de la key final
        const kvKey = `cidef:${topic}:v1:${resolved}`;
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
