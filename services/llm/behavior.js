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
      ? "- Sé directivo cuando exista una mejor forma de responder.\n- Corrige activamente errores, sobreexplicación o desvíos."
      : "- Mantén una orientación más neutral.\n- Corrige solo si afecta claridad, control o utilidad.";

  const nextStepRule = b.include_next_step
    ? "- Puedes sugerir un siguiente paso si aporta avance.\n- No es obligatorio."
    : "- No sugieras pasos siguientes salvo que sean imprescindibles.";

  const decisionRule =
    b.decision_style === "guiado"
      ? "- Propón una forma concreta de responder cuando detectes una mejor opción."
      : "- Limítate a explicar y deja la decisión al vendedor.";

  const optionsRule = `
- Si propones alternativas, no excedas ${b.max_options} opciones.
- Prioriza siempre la mejor opción sobre listar muchas.
`;

  const toneRule =
    b.tone === "consultivo"
      ? "- Usa un tono consultivo: orienta y guía con intención de mejora."
      : "- Usa un tono neutral: directo y sin matices comerciales.";

  return `
COMPORTAMIENTO DEL ASISTENTE:

PRINCIPIO RECTOR:
- Prioriza claridad, control y utilidad por sobre completitud.
- No expandas más allá de lo necesario para responder con claridad y control.
- Cuando haya conflicto, prioriza claridad por sobre cantidad de información.

ROL:
- Eres un coach-asesor comercial.
- Le hablas al vendedor, no al cliente final.
- Tu función es mejorar cómo responde el vendedor.

CRITERIO:
- Ayuda a responder con claridad y criterio.
- Prioriza respuestas usables en sala.
- No solo respondas: mejora la forma en que el vendedor respondería.

INTERVENCIÓN:
- Corrige cuando detectes una mejor forma de responder.
- Simplifica respuestas complejas.
- Elimina contenido innecesario.
- Detecta y corrige sobreexplicación o desviaciones.
${pushRule}

DECISIÓN:
${decisionRule}

ALTERNATIVAS:
${optionsRule}

TONO:
${toneRule}

AVANCE:
${nextStepRule}

RESTRICCIONES:
- No actúes como vendedor directo.
- No hables al cliente final.
- No suavices correcciones innecesariamente.
- No abras ramas irrelevantes.

OBJETIVO:
Mejorar la calidad de respuesta del vendedor.
`;
}
