// PATH: api/decide.js

import { kv } from "@vercel/kv";

/**
 * Router lógico → key real en KV
 * El ROM usa: cliente | comercial | ficha | mitos
 * KV guarda: mapa:*:light
 */
const MAP_ROUTER = {
  cliente: "mapa:cliente:light",
  comercial: "mapa:comercial:light",
  ficha: "mapa:tecnico:light",
  mitos: "mapa:mitos:light",
};

/* =========================
   Helpers SIM (piloto simple)
   ========================= */

function generateRunId() {
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function generateSeed() {
  return Math.floor(Math.random() * 1000000);
}

function pickProfile(sim, seed) {
  // En piloto: leemos perfiles desde KV
  // Se asume key: cidef:sim:buyer_profiles:v1
  // y cidef:sim:seller_profiles:v1

  const key =
    sim === "compra"
      ? "cidef:sim:buyer_profiles:v1"
      : "cidef:sim:seller_profiles:v1";

  return { key, seed };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ maps: {} });
  }

  const {
    trace_id = null,
    requested_maps = [],
    sim = null,
    sim_run_id = null,
  } = req.body || {};

  let sim_context = null;

  /* =========================
     BLOQUE SIM
     ========================= */

  if (sim !== null) {
    if (!sim_run_id) {
      // PRIMER LLAMADO → crear run

      const newRunId = generateRunId();
      const seed = generateSeed();

      const { key } = pickProfile(sim, seed);
      const profilesData = await kv.get(key);

      let profile = null;

      if (profilesData?.profiles?.length) {
        const index = seed % profilesData.profiles.length;
        profile = profilesData.profiles[index];
      }

      if (!profile) {
        return res.status(500).json({
          error: "SIM_PROFILE_NOT_FOUND",
          trace_id,
        });
      }

      await kv.set(`cidef:sim:run:${newRunId}:state:v1`, {
        sim,
        profile_id: profile.id,
        seed,
        turn: 0,
        score: {},
      });

      sim_context = {
        sim_run_id: newRunId,
        profile,
      };
    } else {
      // VALIDAR QUE EL RUN EXISTA

      const state = await kv.get(
        `cidef:sim:run:${sim_run_id}:state:v1`
      );

      if (!state) {
        return res.status(400).json({
          error: "SIM_RUN_NOT_FOUND",
          trace_id,
        });
      }
    }
  }

  /* =========================
     MAPS NORMALES
     ========================= */

  const maps = {};

  for (const logicalMap of requested_maps) {
    const kvKey = MAP_ROUTER[logicalMap];
    maps[logicalMap] = kvKey
      ? (await kv.get(kvKey)) ?? null
      : null;
  }

  res.status(200).json({
    trace_id,
    sim_context,
    maps,
  });
}
