// /services/llm/render.js

import { callLLM } from "./callLLM.js";

// =========================
// CLEAN JSON (robusto)
// =========================
function cleanJSON(raw) {
  if (!raw) return raw;
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}

// =========================
// VALIDACIÓN ESTRUCTURA
// =========================
function validateStructured(s) {
  if (!s?.type) return false;

  switch (s.type) {
    case "decision":
      return (
        s.main_recommendation &&
        typeof s.main_recommendation.model === "string"
      );

    case "comparison":
      return (
        Array.isArray(s.models) &&
        s.models.length > 0 &&
        Array.isArray(s.differences) &&
        s.differences.length > 0
      );

    case "myth":
      return (
        typeof s.claim === "string" &&
        typeof s.verdict === "string"
      );

    case "partial":
      return (
        Array.isArray(s.available_data) &&
        s.available_data.length > 0
      );

    case "no_data":
      return true;

    default:
      return false;
  }
}

// =========================
// STEP 1: JSON estructurado
// =========================
async function buildStructured({ message, data }) {
  const prompt = `
Eres un asesor comercial experto en vehículos.

Responde SOLO con JSON válido.

=========================
CONTRATO DE VERDAD
=========================

- Usa SOLO DATA
- No inferir
- No completar
- Si un dato no está → no existe

=========================
TIPOS
=========================

- decision
- comparison
- myth
- partial
- no_data

=========================
PRIORIDAD DE INTENCIÓN
=========================

- Comparación → comparison
- Objeción → myth
- Recomendación → decision
- Si no es claro → partial

=========================
REGLAS
=========================

- Si no hay datos → no_data
- Si incompleto → partial
- No mezclar tipos
`;

  try {
    const safeData = JSON.stringify(data).slice(0, 12000);

    const res = await callLLM([
      { role: "system", content: prompt },
      {
        role: "user",
        content: `
MENSAJE:
${message}

DATA:
${safeData}
`,
      },
    ]);

    const parsed = JSON.parse(cleanJSON(res.content));
    return parsed;

  } catch (e) {
    console.error("STRUCTURED ERROR:", e);
    return { type: "no_data" };
  }
}

// =========================
// STEP 2: TEXTO FINAL
// =========================
async function buildText({ structured }) {
  const prompt = `
Eres un asesor comercial.

Convierte el JSON en una respuesta clara y ordenada.

=========================
CONTRATO DE RENDER
=========================

- SOLO usar información del JSON
- No agregar contexto
- No reinterpretar
- No completar
- No inventar

- Si el JSON es limitado → la respuesta debe ser limitada

=========================
FORMATO OBLIGATORIO
=========================

- Usar títulos con "##"
- Máximo 5 bullets por sección
- Frases cortas
- NO usar párrafos largos
- Incluir conclusión si existe en JSON

=========================
ESTRUCTURA POR TIPO
=========================

decision:
- recomendación principal
- alternativas
- conclusión

comparison:
- diferencias claras
- conclusión

myth:
- veredicto
- explicación
- puntos clave

partial:
- datos disponibles
- limitaciones

no_data:
→ "No hay información disponible."

JSON:
${JSON.stringify(structured)}
`;

  try {
    const res = await callLLM([
      { role: "system", content: prompt },
      { role: "user", content: "Renderiza el JSON" },
    ]);

    return res.content;

  } catch (e) {
    console.error("RENDER ERROR:", e);
    return "Error temporal, intenta nuevamente";
  }
}

// =========================
// MAIN
// =========================
export async function render({ message, data }) {
  // corte temprano correcto
  if (!data || Object.keys(data).length === 0) {
    return "No hay información disponible";
  }

  const structured = await buildStructured({ message, data });

  console.log("LLM TRACE:", {
    type: structured?.type,
    message,
  });

  // validación fuerte
  if (!validateStructured(structured)) {
    console.error("INVALID STRUCTURED:", structured);
    return "No hay información disponible";
  }

  // fallback contrato
  if (structured.type === "no_data") {
    return "No hay información disponible";
  }

  const finalText = await buildText({ structured });

  return finalText || "No hay información disponible";
}
