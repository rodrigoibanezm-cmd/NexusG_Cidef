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

    // 🔹 Fase actual
    current_phase: initial_phase,

    // 🔹 Turno en que se entró a la fase actual
    // Permite calcular turns_in_phase sin almacenar contador redundante
    phase_entered_turn: 0,

    profile_id,

    // 🔹 Historial mínimo auditable (opcional pero recomendado)
    phase_history: [
      {
        phase: initial_phase,
        entered_at_turn: 0,
        entered_at: now
      }
    ],

    finished: false,
    finish_reason: null
  };
}
