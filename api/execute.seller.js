// PATH: api/execute.seller.js

import { kv } from "@vercel/kv";
import executeNormal from "./execute.normal.js";

export default async function executeSeller(req, res) {
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

  sim_state.turn = (sim_state.turn || 0) + 1;

  await kv.set(stateKey, JSON.stringify(sim_state));

  return executeNormal(req, res);
}
