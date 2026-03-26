// /services/llm/behavior.js

// =========================
// ENUMS (single source of truth - frozen + exported)
// =========================

export const ENUMS = Object.freeze({
  decision_style: Object.freeze(["guiado", "informativo"]),
  push_level: Object.freeze(["bajo", "medio"]),
  tone: Object.freeze(["consultivo", "neutral"]),
  max_options: Object.freeze([1, 2, 3]),
});

// =========================
// DEFAULT (frozen)
// =========================

export const defaultBehavior = Object.freeze({
  decision_style: "guiado",
  max_options: 2,
  include_next_step: true,
  push_level: "medio",
  tone: "consultivo",
});

// =========================
// SANITIZE (returns frozen object)
// =========================

export function sanitizeBehavior(cfg) {
  if (!cfg || typeof cfg !== "object") {
    cfg = {};
  }

  const safe = {
    decision_style: ENUMS.decision_style.includes(cfg.decision_style)
      ? cfg.decision_style
      : defaultBehavior.decision_style,

    max_options: ENUMS.max_options.includes(cfg.max_options)
      ? cfg.max_options
      : defaultBehavior.max_options,

    include_next_step:
      typeof cfg.include_next_step === "boolean"
        ? cfg.include_next_step
        : defaultBehavior.include_next_step,

    push_level: ENUMS.push_level.includes(cfg.push_level)
      ? cfg.push_level
      : defaultBehavior.push_level,

    tone: ENUMS.tone.includes(cfg.tone)
      ? cfg.tone
      : defaultBehavior.tone,
  };

  return Object.freeze(safe);
}

// =========================
// DEFAULT CHECK (defensive)
// =========================

export function isDefaultBehavior(cfg = defaultBehavior) {
  if (!cfg || typeof cfg !== "object") return true;

  return (
    cfg.decision_style === defaultBehavior.decision_style &&
    cfg.max_options === defaultBehavior.max_options &&
    cfg.include_next_step === defaultBehavior.include_next_step &&
    cfg.push_level === defaultBehavior.push_level &&
    cfg.tone === defaultBehavior.tone
  );
}

// =========================
// BUILD PROMPT BLOCK (self-sanitizing)
// =========================

export function buildBehaviorBlock(cfg = defaultBehavior) {
  const safe = sanitizeBehavior(cfg);

  return `
COMPORTAMIENTO DE RESPUESTA:

- Estilo: ${
    safe.decision_style === "guiado"
      ? "priorizar recomendación clara y cierre"
      : "entregar información sin guiar la decisión"
  }

- Mostrar máximo ${safe.max_options} opciones relevantes

- ${
    safe.include_next_step
      ? "Incluir un siguiente paso claro para el vendedor"
      : "No incluir siguiente paso"
  }

- Nivel de empuje: ${
    safe.push_level === "medio"
      ? "sugerir con claridad sin presionar"
      : "explorar sin empujar decisión"
  }

- Tono: ${
    safe.tone === "consultivo"
      ? "asesorar con claridad y sin presión"
      : "neutral y directo"
  }
`.trim();
}
