// PATH: api/sim/updateTurn.js

export function applyTurnUpdate(sim_state) {
  if (!sim_state) {
    throw new Error("SIM_STATE_REQUIRED");
  }

  const now = Date.now();

  const updated = {
    ...sim_state,
    turn: (sim_state.turn || 0) + 1,
    last_activity_at: now
  };

  // 🔒 Cierre automático por max_turns
  if (
    typeof updated.max_turns === "number" &&
    updated.turn >= updated.max_turns &&
    !updated.finished
  ) {
    updated.finished = true;
    updated.finish_reason = "max_turns_reached";
  }

  return updated;
}
