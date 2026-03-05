// PATH: api/execute.seller.js

import { kv } from "@vercel/kv";
import { applyTurnUpdate } from "./sim/updateTurn.js";
import { applyPhaseTransition } from "./sim/applyPhaseTransition.js";

export default async function executeSeller(body) {
  try {
    const { sim_run_id = null, proposed_next_phase = null } = body || {};

    if (!sim_run_id) {
      return { error: "SIM_RUN_REQUIRED" };
    }

    const stateKey = `cidef:sim:run:${sim_run_id}:state:v1`;
    const raw = await kv.get(stateKey);

    if (!raw) {
      return { error: "SIM_RUN_NOT_FOUND" };
    }

    let sim_state;

    try {
      sim_state = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return { error: "SIM_STATE_INVALID_JSON" };
    }

    if (sim_state.finished) {
      return { error: "SIM_ALREADY_FINISHED" };
    }

    // 1️⃣ Lifecycle del turno
    const lifecycleState = applyTurnUpdate(sim_state);

    // 2️⃣ Behavior core seller
    const rawBehavior = await kv.get("cidef:sim:behavior_core_seller:v1");

    if (!rawBehavior) {
      return { error: "BEHAVIOR_CORE_SELLER_NOT_FOUND" };
    }

    const behavior_core =
      typeof rawBehavior === "string"
        ? JSON.parse(rawBehavior)
        : rawBehavior;

    // 3️⃣ Estado final (transición solo si sigue activo)
    let finalState = lifecycleState;

    if (!lifecycleState.finished) {
      finalState = applyPhaseTransition({
        sim_state: lifecycleState,
        behavior_core,
        proposed_next_phase
      });
    }

    // 4️⃣ Persistir estado
    await kv.set(stateKey, JSON.stringify(finalState));

    // 5️⃣ Perfil seller
    const rawProfiles = await kv.get("cidef:sim:seller_profiles:v1");

    if (!rawProfiles) {
      return { error: "SELLER_PROFILES_NOT_FOUND" };
    }

    const profilesData =
      typeof rawProfiles === "string"
        ? JSON.parse(rawProfiles)
        : rawProfiles;

    const profile = profilesData.profiles.find(
      (p) => p.id === finalState.profile_id
    );

    if (!profile) {
      return { error: "SELLER_PROFILE_NOT_FOUND" };
    }

    // 6️⃣ Respuesta SIM
    return {
      active: true,
      mode: "venta",
      sim_run_id,
      turn: finalState.turn,
      current_phase: finalState.current_phase,
      finished: finalState.finished,
      finish_reason: finalState.finish_reason,
      profile,
      behavior_core
    };

  } catch (error) {
    console.error("EXECUTE_SELLER_FATAL:", error);

    return {
      error: "EXECUTE_SELLER_INTERNAL_ERROR"
    };
  }
}
