// /services/selector/selectModels.js

import { callLLM } from "../llm/callLLM.js";

// =========================
// CLEAN JSON (robusto)
// =========================
function cleanJSON(raw) {
  if (!raw) return raw;
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}

// =========================
// SELECT MODELS
// =========================
export async function selectModels({ message, maps }) {
  // 1. universo válido (backend manda)
  const modelIds = Object.values(maps || {})
    .flat()
    .map(m => m?.model_id)
    .filter(Boolean);

  if (!modelIds.length) return [];

  const prompt = `
Eres un selector de modelos.

Tu tarea es elegir los modelos MÁS relevantes para responder al usuario.

=========================
REGLAS
=========================

- Usa SOLO los modelos disponibles
- NO inventar modelos
- Elegir máximo 3 modelos
- Elegir los MÁS relevantes (no todos)
- Si no es claro → devolver []

=========================
CRITERIO
=========================

- Ajuste al uso (familia, trabajo, ciudad, precio, etc.)
- Coherencia con la intención del usuario

=========================
FORMATO
=========================

{
  "models": []
}
`;

  try {
    const res = await callLLM([
      { role: "system", content: prompt },
      {
        role: "user",
        content: `
MENSAJE:
${message}

MODELOS DISPONIBLES:
${JSON.stringify(modelIds)}
`,
      },
    ]);

    const parsed = JSON.parse(cleanJSON(res.content));

    if (!Array.isArray(parsed.models)) return [];

    // 2. backend valida (CRÍTICO)
    const valid = parsed.models
      .filter(m => modelIds.includes(m))
      .slice(0, 3);

    console.log("MODEL SELECTION:", {
      input: message,
      selected: valid,
    });

    return valid;

  } catch (e) {
    console.error("SELECT MODELS ERROR:", e);
    return [];
  }
}
