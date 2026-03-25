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
// NORMALIZADOR
// =========================
function normalize(s) {
  return (s || "").toLowerCase().replace(/\s+/g, "");
}

// =========================
// SELECT MODELS V3
// =========================
export async function selectModels({ message, maps }) {
  const mapKeys = Object.keys(maps || {});

  // 🔴 mitos → no selector (por ahora)
  if (mapKeys.includes("mitos")) {
    return [];
  }

  // =========================
  // UNIVERSO BACKEND
  // =========================
  const modelIds = Object.values(maps)
    .flat()
    .map((m) => m?.model_id)
    .filter(Boolean);

  if (!modelIds.length) return [];

  // =========================
  // LLM PROPONE
  // =========================
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

    const candidates = parsed.models;

    // =========================
    // VALIDACIÓN BACKEND
    // =========================
    let valid = candidates.filter((c) =>
      modelIds.some((m) => normalize(m) === normalize(c))
    );

    // =========================
    // FALLBACK CONTROLADO
    // =========================
    if (valid.length === 0) {
      if (modelIds.length === 1) {
        valid = [modelIds[0]];
      }
    }

    // =========================
    // REGLAS DE NEGOCIO
    // =========================
    if (isComparison(message) && valid.length < 2) {
      valid = modelIds.slice(0, 2);
    }

    if (!isComparison(message) && valid.length === 0) {
      valid = modelIds.slice(0, 1);
    }

    const finalModels = valid.slice(0, 3);

    console.log("MODEL SELECTION:", {
      message,
      candidates,
      universe: modelIds,
      selected: finalModels,
    });

    return finalModels;

  } catch (e) {
    console.error("SELECT MODELS ERROR:", e);
    return [];
  }
}
