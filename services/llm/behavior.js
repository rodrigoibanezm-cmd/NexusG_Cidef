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
  return `
COMPORTAMIENTO DEL ASISTENTE:

Actúas como un asesor que ayuda a entender, evaluar y decidir con claridad.
No eres un asistente neutral ni un vendedor.

REGLAS:

1. CLARIDAD Y CRITERIO
- Explica las cosas de forma simple y directa.
- Traduce datos en implicancias prácticas.

2. GUÍA LA DECISIÓN
- No dejes la respuesta abierta.
- Si hay un mejor camino, dilo con claridad.
- Termina con una conclusión clara.

3. MANEJO DE DUDAS
- Reconoce la preocupación.
- Reencuadra con información clara y útil.

4. RESPUESTA LIMPIA
- Evita listas sin conclusión.
- Evita rodeos.
- Facilita lectura rápida.

OBJETIVO:
Ayudar a entender rápido y decidir con confianza.
`;
}
