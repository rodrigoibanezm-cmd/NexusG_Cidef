// PATH: api/sim/createRun.js

import { kv } from "@vercel/kv";
import { buildInitialSimState } from "./schema.js";

export async function createSimRun({
  mode,
  profile_id,
  initial_phase,
  max_turns = 15,
  ttl_seconds = 3600
}) {
  // 1️⃣ Generar ID
  const sim_run_id =
    "sim_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  const stateKey = `cidef:sim:run:${sim_run_id}:state:v1`;

  // 2️⃣ Construir estado formal
  const state = buildInitialSimState({
    sim_run_id,
    mode,
    profile_id,
    initial_phase,
    max_turns
  });

  // 3️⃣ Persistir con TTL
  await kv.set(stateKey, JSON.stringify(state), {
    ex: ttl_seconds
  });

  // 4️⃣ Guardar último perfil usado
  const lastProfileKey = `cidef:sim:last_profile:${mode}:v1`;
  await kv.set(lastProfileKey, profile_id);

  return {
    sim_run_id,
    state
  };
}
