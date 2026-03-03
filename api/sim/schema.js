// PATH: api/sim/schema.js

export function buildInitialSimState({
  sim_run_id,
  mode,
  profile_id,
  initial_phase,
  max_turns = 15
}) {
  const now = Date.now();

  return {
    sim_run_id,
    mode,

    created_at: now,
    last_activity_at: now,

    turn: 0,
    max_turns,

    current_phase: initial_phase,
    profile_id,

    finished: false,
    finish_reason: null
  };
}
