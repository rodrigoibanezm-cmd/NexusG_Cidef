// PATH: api/sim/applyPhaseTransition.js

export function applyPhaseTransition({
  sim_state,
  behavior_core,
  proposed_next_phase = null
}) {
  if (!sim_state) {
    throw new Error("SIM_STATE_REQUIRED");
  }

  if (!behavior_core?.behavior_core?.phase_model) {
    throw new Error("PHASE_MODEL_REQUIRED");
  }

  const phaseModel = behavior_core.behavior_core.phase_model;

  const {
    phases = [],
    min_turns_in_phase = 0,
    transition_rules = {},
    transition_rules_behavior = {}
  } = phaseModel;

  const {
    single_phase_step_per_turn = true,
    remain_if_no_trigger = true
  } = transition_rules_behavior;

  const currentPhase = sim_state.current_phase;
  const currentTurn = sim_state.turn;

  // 🔒 Si no hay propuesta → no cambiar
  if (!proposed_next_phase) {
    return sim_state;
  }

  // 🔒 Validar que fase exista en enum
  if (!phases.includes(proposed_next_phase)) {
    return sim_state;
  }

  // 🔒 No permitir auto-transición
  if (proposed_next_phase === currentPhase) {
    return sim_state;
  }

  // 🔒 Validar que exista regla estructural desde fase actual
  const validTransitions = Object.keys(transition_rules)
    .filter((key) => key.startsWith(`${currentPhase}_to_`))
    .map((key) => key.split("_to_")[1]);

  if (!validTransitions.includes(proposed_next_phase)) {
    return sim_state;
  }

  // 🔒 Respetar min_turns_in_phase
  const turnsInPhase = currentTurn - sim_state.phase_entered_turn;

  if (turnsInPhase < min_turns_in_phase) {
    return sim_state;
  }

  // 🔒 Single step por turno (defensivo)
  if (
    single_phase_step_per_turn &&
    sim_state.last_transition_turn === currentTurn
  ) {
    return sim_state;
  }

  // ✅ Aplicar transición
  const now = Date.now();

  return {
    ...sim_state,
    current_phase: proposed_next_phase,
    phase_entered_turn: currentTurn,
    last_transition_turn: currentTurn,
    phase_history: [
      ...(sim_state.phase_history || []),
      {
        phase: proposed_next_phase,
        entered_at_turn: currentTurn,
        entered_at: now
      }
    ]
  };
}
