// PATH: api/execute.js
// LINES: 55

import { kv } from "@vercel/kv";

/**
 * Router canónico de keys (copiado 1:1 de la definición)
 */
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ data: [] });
  }

  const { trace_id = null, topic, models = [] } = req.body || {};

  if (!topic || !KEY_ROUTER[topic] || !Array.isArray(models)) {
    return res.status(400).json({ error: "INVALID_INPUT" });
  }

  const data = [];

  for (const model of models) {
    const key = KEY_ROUTER[topic][model];
    const payload = key ? (await kv.get(key)) ?? null : null;

    data.push({ modelo: model, payload });
  }

  res.status(200).json({
    trace_id,
    topic,
    data,
  });
}
