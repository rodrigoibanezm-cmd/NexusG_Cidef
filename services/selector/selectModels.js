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
  return (s || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

// =========================
// SELECT MODELS
// =========================
export async function selectModels({ message, maps }) {
  const mapKeys = Object.keys(maps || {});

  if (mapKeys.includes("mitos")) {
    return [];
  }

  const modelIds = [...new Set(
    Object.values(maps)
      .flat()
      .map((m) => m?.model_id)
      .filter(Boolean)
  )];

  if (!modelIds.length) return [];

  const prompt = `
Responde solo en JSON válido.

Formato obligatorio:
{
  "models": []
}

REGLAS:

- Usa solo los modelos disponibles
- No inventes modelos
- Elige máximo 2 modelos
- Elige los más relevantes para responder el mensaje

- Si es comparación, elige 2 modelos cuando exista contexto suficiente
- Si es recomendación, elige 1 modelo cuando exista una mejor opción clara
- No devuelvas vacío si hay contexto suficiente

SALIDA:

- No expliques
- No agregues texto fuera del JSON
- No agregues claves distintas de "models"
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

    let valid = candidates.filter((c) =>
      modelIds.some((m) => normalize(m) === normalize(c))
    );

    if (valid.length === 0 && modelIds.length === 1) {
      valid = [modelIds[0]];
    }

    if (isComparison(message) && valid.length < 2) {
      valid = modelIds.slice(0, 2);
    }

    if (!isComparison(message) && valid.length === 0) {
      valid = modelIds.slice(0, 1);
    }

    const finalModels = valid.slice(0, 2);

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
