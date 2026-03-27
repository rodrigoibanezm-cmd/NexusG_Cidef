// /services/llm/behavior.js

// =========================
// DEFAULT
// =========================

export const defaultBehavior = {
  decision_style: "guiado",
  max_options: 2,
  include_next_step: true,
  push_level: "medio",
  tone: "consultivo",
};

// =========================
// SANITIZE
// =========================

export function sanitizeBehavior(cfg = {}) {
  return {
    decision_style: ["guiado", "informativo"].includes(cfg.decision_style)
      ? cfg.decision_style
      : "guiado",

    max_options: [1, 2, 3].includes(cfg.max_options)
      ? cfg.max_options
      : 2,

    include_next_step:
      typeof cfg.include_next_step === "boolean"
        ? cfg.include_next_step
        : true,

    push_level: ["bajo", "medio"].includes(cfg.push_level)
      ? cfg.push_level
      : "medio",

    tone: ["consultivo", "neutral"].includes(cfg.tone)
      ? cfg.tone
      : "consultivo",
  };
}

// =========================
// DEFAULT CHECK
// =========================

export function isDefaultBehavior(b) {
  return (
    b.decision_style === defaultBehavior.decision_style &&
    b.max_options === defaultBehavior.max_options &&
    b.include_next_step === defaultBehavior.include_next_step &&
    b.push_level === defaultBehavior.push_level &&
    b.tone === defaultBehavior.tone
  );
}

// =========================
// BUILD BLOCK
// =========================

export function buildBehaviorBlock(b) {
  const pushRule =
    b.push_level === "medio"
      ? "- Intervén cuando exista una mejor forma de responder.\n- Corrige si mejora claridad o utilidad."
      : "- Mantén una orientación neutral.\n- Corrige solo si es necesario.";

  const nextStepRule = b.include_next_step
    ? "- Puedes sugerir un siguiente paso si ayuda a avanzar."
    : "- No sugieras pasos salvo que sean imprescindibles.";

  const decisionRule =
    b.decision_style === "guiado"
      ? "- Cuando haya un mejor camino, oriéntalo con claridad."
      : "- Limítate a explicar sin empujar una conclusión.";

  const optionsRule = `
- Si propones alternativas, no excedas ${b.max_options} opciones.
- Prioriza pocas opciones relevantes.
`;

  const toneRule =
    b.tone === "consultivo"
      ? "- Usa un tono consultivo y práctico."
      : "- Usa un tono neutral y directo.";

  return `
COMPORTAMIENTO DEL ASISTENTE:

ROL:
- Eres un coach de ventas especializado en vehículos.
- Le hablas al vendedor, no al cliente final.
- Tu función es ayudarlo a responder mejor.

ENFOQUE:
- No actúes como catálogo.
- No listes información sin criterio.
- Explica solo lo necesario para que la respuesta sea usable en sala.
${pushRule}

DECISIÓN:
${decisionRule}

ALTERNATIVAS:
${optionsRule}

TONO:
${toneRule}

AVANCE:
${nextStepRule}
`;
}

