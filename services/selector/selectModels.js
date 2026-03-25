// /services/selector/selectModels.js

import { callLLM } from "../llm/callLLM.js";

// =========================
// CLEAN JSON
// =========================
function cleanJSON(raw) {
  if (!raw) return raw;
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}

// =========================
// DETECCIÓN SIMPLE
// =========================
function isComparison(message) {
  const m = message.toLowerCase();
  return (
    m.includes(" vs ") ||
    m.includes(" versus ") ||
    m.includes("entre") ||
    m.includes("diferencia") ||
    m.includes("mejor que")
  );
}

// =========================
// SELECT MODELS V2
// =========================
export async function selectModels({ message, maps }) {
  const mapKeys = Object.keys(maps || {});

  // 🔴 1. mitos → NO selector
  if (mapKeys.includes("mitos")) {
    return [];
  }

  // 🔴 2. ficha pura → NO selector
  if (mapKeys.length === 1 && mapKeys[0] === "ficha") {
    return [];
  }

  // universo válido
  const modelIds = Object.values(maps)
    .flat()
    .map(m => m?.model_id)
    .filter(Boolean);

  if (!modelIds.length) return [];

  const prompt = `
Eres un selector de modelos.

=========================
REGLAS
=========================

- Usa SOLO los modelos disponibles
- NO inventar modelos
- Elegir máximo 3 modelos
- Elegir los MÁS relevantes

- IMPORTANTE:
  - Si es comparación → elegir al menos 2 modelos
  - Si es recomendación → elegir al menos 1 modelo
  - NO devolver vacío si hay contexto suficiente

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

    let valid = parsed.models.filter(m => modelIds.includes(m));

    // 🔴 3. asegurar mínimo en comparación
    if (isComparison(message) && valid.length < 2) {
      valid = modelIds.slice(0, 2);
    }

    // 🔴 4. asegurar mínimo en decisión
    if (!isComparison(message) && valid.length === 0) {
      valid = modelIds.slice(0, 1);
    }

    const finalModels = valid.slice(0, 3);

    console.log("MODEL SELECTION:", {
      message,
      selected: finalModels,
    });

    return finalModels;

  } catch (e) {
    console.error("SELECT MODELS ERROR:", e);
    return [];
  }
}
