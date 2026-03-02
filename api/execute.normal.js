// PATH: api/execute.normal.js

import { kv } from "@vercel/kv";

const KEY_ROUTER = {
  ficha: {
    t5: "cidef:fichas:v1:ft_v1_t5",
    t5_evo: "cidef:fichas:v1:ft_v1_t5_evo",
    t5l: "cidef:fichas:v1:ft_v1_t5l",
    t5_evo_hev: "cidef:fichas:v1:ft_v1_t5_evo_hev",
    foton_v9: "cidef:fichas:v1:ft_v1_foton_v9",
    s50_ev: "cidef:fichas:v1:ft_v1_s50_ev",
  },
  comercial: {
    t5: "cidef:comercial:v1:comercial_v1_t5",
    t5_evo: "cidef:comercial:v1:comercial_v1_t5_evo",
    t5l: "cidef:comercial:v1:comercial_v1_t5l",
    t5_evo_hev: "cidef:comercial:v1:comercial_v1_t5_evo_hev",
    foton_v9: "cidef:comercial:v1:comercial_v1_foton_v9",
    s50_ev: "cidef:comercial:v1:comercial_v1_s50_ev",
  },
  cliente: {
    t5: "cidef:clientes:v1:cliente_v1_t5",
    t5_evo: "cidef:clientes:v1:cliente_v1_t5_evo",
    t5l: "cidef:clientes:v1:cliente_v1_t5l",
    t5_evo_hev: "cidef:clientes:v1:cliente_v1_t5_evo_hev",
    foton_v9: "cidef:clientes:v1:cliente_v1_foton_v9",
    s50_ev: "cidef:clientes:v1:cliente_v1_s50_ev",
  },
  mitos: {
    ev: "cidef:mitos:v1:mitos_v1_ev",
    china: "cidef:mitos:v1:mitos_v1_china",
    ev_china: "cidef:mitos:v1:mitos_v1_ev_china",
  },
};

function normalizeModel(label) {
  if (!label || typeof label !== "string") return null;
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

// 🔹 Ahora es función pura
export default async function executeNormal(body) {
  const { trace_id = null, topic, models = [] } = body || {};

  if (!topic || !KEY_ROUTER[topic] || !Array.isArray(models)) {
    return { error: "INVALID_INPUT" };
  }

  const targets =
    topic === "mitos" && models.length === 0
      ? Object.keys(KEY_ROUTER.mitos)
      : models;

  const data = [];

  for (const raw of targets) {
    const canonical = normalizeModel(raw);
    const kvKey = canonical ? KEY_ROUTER[topic][canonical] : null;

    let payload = null;

    if (kvKey) {
      payload = await kv.get(kvKey);
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
