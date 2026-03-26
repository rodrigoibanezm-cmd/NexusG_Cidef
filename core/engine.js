// /services/llm/render.js

import { callLLM } from "../services/llm/callLLM.js";
import { getPrompt } from "../services/llm/promptSelector.js";
import { getBehaviorBlock } from "../services/llm/behaviorService.js";

const NO_DATA_MESSAGE = "No hay información disponible.";

// =========================
// HELPERS
// =========================

function buildSafeData(data, maxItems = 8) {
  if (!Array.isArray(data)) return "[]";

  const validItems = data.filter((x) => x && x.payload);
  return JSON.stringify(validItems.slice(0, maxItems));
}

function isWeakOutput(text) {
  if (typeof text !== "string") return true;

  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < 24) return true;

  const weakPatterns = [
    "depende",
    "no sé",
    "no lo sé",
    "ambas son buenas opciones",
  ];

  const normalized = trimmed.toLowerCase();
  return weakPatterns.includes(normalized);
}

// =========================
// MAIN RENDER
// =========================

export async function render({
  message,
  data,
  maps = [],
  tenantId = "default",
}) {
  // =========================
  // HARD FALLBACK
  // =========================
  if (!data || !Array.isArray(data) || data.length === 0) {
    return NO_DATA_MESSAGE;
  }

  // =========================
  // PROMPT
  // =========================
  const { prompt, type } = getPrompt(maps);

  const decisionBlock = `
REGLAS DE RESPUESTA:

- Si el usuario está comparando, evaluando o pidiendo recomendación:
  → debes cerrar con una recomendación clara.

- Evitar:
  - "depende"
  - respuestas neutrales
  - listar opciones sin conclusión

- Priorizar:
  - el criterio principal del usuario
  - el ganador claro
  - contraste breve
  - cierre directo

- Si hay un ganador claro, debes recomendar solo una opción al final.
- Solo mostrar más de una opción si realmente hay empate.
`;

  // =========================
  // BEHAVIOR
  // =========================
  const behaviorBlock = await getBehaviorBlock(tenantId);

  const systemPrompt = [
    behaviorBlock,
    decisionBlock,
    prompt,
  ]
    .filter(Boolean)
    .join("\n");

  // =========================
  // LOG INPUT
  // =========================
  console.log("RENDER INPUT:", {
    message_length: message?.length || 0,
    maps,
    data_count: data.length,
    prompt_type: type,
    tenant_id: tenantId,
    has_behavior: !!behaviorBlock,
  });

  try {
    const safeData = buildSafeData(data, 8);

    const res = await callLLM([
      { role: "system", content: systemPrompt },
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

    const output = res?.content;

    console.log("RENDER OUTPUT LENGTH:", output?.length);

    if (isWeakOutput(output)) {
      return NO_DATA_MESSAGE;
    }

    return output.trim();

  } catch (e) {
    console.error("RENDER ERROR:", e?.message);
    return NO_DATA_MESSAGE;
  }
}
