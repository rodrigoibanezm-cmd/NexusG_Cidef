// /api/execute.normal.js

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
  const {
    trace_id = null,
    topic,
    models = [],
    tenant_id = null,
  } = body || {};

  // =========================
  // Validación
  // =========================
  if (!topic || !RESOLVER_KEYS[topic] || !Array.isArray(models)) {
    return { error: "INVALID_INPUT" };
  }

  const resolverKey = RESOLVER_KEYS[topic];
  const basePrefix = TOPIC_PREFIX[topic];

  // =========================
  // Resolver (tenant-aware + fallback)
  // =========================
  let resolver = null;

  if (tenant_id) {
    const tenantResolverKey = `${tenant_id}:${resolverKey}`;
    resolver = await kv.get(tenantResolverKey);
  }

  if (!resolver) {
    resolver = await kv.get(resolverKey);
  }

  // =========================
  // Targets
  // =========================
  const targets =
    topic === "mitos" && models.length === 0
      ? Object.keys(resolver || {})
      : models;

  const data = [];

  // =========================
  // Loop principal
  // =========================
  for (const raw of targets) {
    const canonical = normalizeModel(raw);

    let payload = null;

    if (canonical && resolver) {
      const resolved = resolver[canonical];

      if (resolved) {
        // 1. intentar tenant
        if (tenant_id) {
          const tenantKey = `${tenant_id}:${basePrefix}:${resolved}`;
          payload = await kv.get(tenantKey);
        }

        // 2. fallback global
        if (!payload) {
          const globalKey = `${basePrefix}:${resolved}`;
          payload = await kv.get(globalKey);
        }
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
