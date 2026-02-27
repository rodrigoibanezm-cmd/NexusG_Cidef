// PATH: api/execute.js

import { kv } from "@vercel/kv";

/**
 * Router canónico (ID lógico → KV real)
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

function normalizeModel(label) {
  if (!label || typeof label !== "string") return null;
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

const ALLOWED_INTENTS = [
  "lead_calificado",
  "agenda_propuesta",
  "test_drive_propuesto",
  "sim_finalizada",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const {
    trace_id = null,
    topic,
    models = [],
    sim = null,
    sim_run_id = null,
    intent_detected = null,
  } = req.body || {};

  if (!topic || !KEY_ROUTER[topic] || !Array.isArray(models)) {
    return res.status(400).json({ error: "INVALID_INPUT" });
  }

  /* =========================
     VALIDACIÓN SIM (si aplica)
     ========================= */

  let sim_state = null;

  if (sim !== null) {
    if (!sim_run_id) {
      return res.status(400).json({
        error: "SIM_RUN_REQUIRED",
        trace_id,
      });
    }

    sim_state = await kv.get(
      `cidef:sim:run:${sim_run_id}:state:v1`
    );

    if (!sim_state) {
      return res.status(400).json({
        error: "SIM_RUN_NOT_FOUND",
        trace_id,
      });
    }
  }

  /* =========================
     EJECUCIÓN NORMAL (igual que antes)
     ========================= */

  const targets =
    topic === "mitos" && models.length === 0
      ? Object.keys(KEY_ROUTER.mitos)
      : models;

  const data = [];

  for (const raw of targets) {
    const canonical = normalizeModel(raw);
    const kvKey = canonical ? KEY_ROUTER[topic][canonical] : null;
    const payload = kvKey ? (await kv.get(kvKey)) ?? null : null;

    data.push({
      modelo: raw,
      payload,
    });
  }

  /* =========================
     ACTUALIZACIÓN SIM (piloto simple)
     ========================= */

  if (sim_state) {
    // Incrementar turn
    sim_state.turn = (sim_state.turn || 0) + 1;

    // Registrar intent si viene
    if (intent_detected && ALLOWED_INTENTS.includes(intent_detected)) {
      sim_state.score = sim_state.score || {};
      sim_state.score[intent_detected] = true;
    }

    await kv.set(
      `cidef:sim:run:${sim_run_id}:state:v1`,
      sim_state
    );
  }

  res.status(200).json({
    trace_id,
    topic,
    data,
  });
}
