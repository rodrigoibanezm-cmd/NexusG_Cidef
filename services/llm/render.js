// /services/llm/render.js

import { callLLM } from "./callLLM.js";

// =========================
// CLEAN JSON
// =========================
function cleanJSON(raw) {
  if (!raw) return raw;
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}

// =========================
// VALIDACIÓN SUAVE
// =========================
function normalizeStructured(s) {
  if (!s?.type) return { type: "partial", raw: s };

  switch (s.type) {
    case "decision":
    case "comparison":
    case "myth":
    case "partial":
    case "no_data":
      return s;

    default:
      return { type: "partial", raw: s };
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
    return { type: "partial" };
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
REGLAS
=========================

- SOLO usar información del JSON
- No inventar
- No agregar contexto

- Usar títulos "##"
- Máximo 5 bullets
- Frases cortas

=========================
FALLBACK
=========================

Si la información es limitada, responde igual con lo disponible.

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
  if (!data || !Array.isArray(data) || data.length === 0) {
    return "No hay información disponible";
  }

  const structuredRaw = await buildStructured({ message, data });

  const structured = normalizeStructured(structuredRaw);

  console.log("LLM TRACE:", {
    type: structured?.type,
    message,
  });

  if (structured.type === "no_data") {
    return "No hay información disponible";
  }

  const finalText = await buildText({ structured });

  return finalText || "No hay información disponible";
}
