// PATH: api/execute.buyer.js

import { kv } from "@vercel/kv";
import executeNormal from "./execute.normal.js";

export default async function executeBuyer(req, res) {
  try {
    const { sim_run_id = null } = req.body || {};

    if (!sim_run_id) {
      return res.status(400).json({ error: "SIM_RUN_REQUIRED" });
    }

    const stateKey = `cidef:sim:run:${sim_run_id}:state:v1`;
    const raw = await kv.get(stateKey);

    if (!raw) {
      return res.status(400).json({ error: "SIM_RUN_NOT_FOUND" });
    }

    let sim_state;

    try {
      sim_state = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return res.status(500).json({ error: "SIM_STATE_INVALID_JSON" });
    }

    if (sim_state.finished) {
      return res.status(400).json({ error: "SIM_ALREADY_FINISHED" });
    }

    /* =========================
       1️⃣ Incrementar turn
       ========================= */

    sim_state.turn = (sim_state.turn || 0) + 1;

    await kv.set(stateKey, JSON.stringify(sim_state));

    /* =========================
       2️⃣ Cargar behavior_core_buyer
       ========================= */

    const rawBehavior = await kv.get(
      "cidef:sim:behavior_core_buyer:v1"
    );

    if (!rawBehavior) {
      return res.status(500).json({
        error: "BEHAVIOR_CORE_BUYER_NOT_FOUND",
      });
    }

    const behavior_core =
      typeof rawBehavior === "string"
        ? JSON.parse(rawBehavior)
        : rawBehavior;

    /* =========================
       3️⃣ Cargar perfil completo
       ========================= */

    const rawProfiles = await kv.get(
      "cidef:sim:buyer_profiles:v1"
    );

    if (!rawProfiles) {
      return res.status(500).json({
        error: "BUYER_PROFILES_NOT_FOUND",
      });
    }

    const profilesData =
      typeof rawProfiles === "string"
        ? JSON.parse(rawProfiles)
        : rawProfiles;

    const profile = profilesData.profiles.find(
      (p) => p.id === sim_state.profile_id
    );

    if (!profile) {
      return res.status(500).json({
        error: "BUYER_PROFILE_NOT_FOUND",
      });
    }

    /* =========================
       4️⃣ Obtener payload normal
       ========================= */

    const normalResponse = await executeNormal(req, res);

    if (!normalResponse || normalResponse.error) {
      return normalResponse;
    }

    /* =========================
       5️⃣ Devolver payload + bloque SIM
       ========================= */

    return res.status(200).json({
      ...normalResponse,
      sim: {
        active: true,
        mode: "compra",
        sim_run_id,
        turn: sim_state.turn,
        current_phase: sim_state.current_phase,
        finished: sim_state.finished,
        profile,
        behavior_core
      }
    });

  } catch (error) {
    console.error("EXECUTE_BUYER_FATAL:", error);
    return res.status(500).json({
      error: "EXECUTE_BUYER_INTERNAL_ERROR",
    });
  }
}
