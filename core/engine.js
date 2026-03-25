// /core/engine.js

import { callLLM } from "../services/llm/callLLM.js";
import { runTool } from "../services/tools.js";
import { render } from "../services/llm/render.js";

const VALID_TOPICS = ["cliente", "comercial", "ficha", "mitos"];

export async function runEngine({
  message,
  req,
  systemPrompt,
  trace,
  tenant_id,
}) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${protocol}://${req.headers.host}`;

  // =========================
  // 1. LLM → maps (decide)
  // =========================
  const llmResponse = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);

  if (!llmResponse?.content) {
    throw new Error("LLM returned empty response");
  }

  let decision;
  try {
    decision = JSON.parse(llmResponse.content);
  } catch {
    throw new Error("Invalid JSON from LLM");
  }

  if (!decision || !Array.isArray(decision.maps)) {
    throw new Error("Invalid LLM JSON structure");
  }

  const maps = decision.maps;

  if (maps.length === 0) {
    return { message: "No hay información disponible" };
  }

  const topic = maps[0];

  if (!VALID_TOPICS.includes(topic)) {
    throw new Error("Invalid topic");
  }

  // =========================
  // 2. decideMaps
  // =========================
  const decideResult = await runTool({
    name: "decideMaps",
    args: {
      requested_maps: maps,
      trace_id: trace?.trace_id,
    },
    baseUrl,
    tenant_id,
  });

  // =========================
  // 3. EXTRAER model_id
  // =========================
  const modelIds =
    decideResult?.maps?.[topic]?.map((m) => m.model_id) || [];

  // =========================
  // 4. LLM → resolver models
  // =========================
  const modelResponse = await callLLM([
    {
      role: "system",
      content: `
Responde SOLO en JSON válido.

Formato:
{
  "models": []
}

Tarea:
Selecciona los modelos mencionados en el mensaje.

Instrucciones:
- Usa la lista de MODELOS DISPONIBLES
- Si el mensaje contiene un modelo (ej: "mage") → devolver ["mage"]
- Si no hay modelo → []
- Match flexible (ej: "t5 evo" → "t5_evo")

Prohibido:
- inventar modelos
- responder fuera del JSON

Ejemplo:
MENSAJE: "que motor tiene el mage"
→ { "models": ["mage"] }
`,
    },
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

  let models = [];

  try {
    const parsed = JSON.parse(modelResponse.content);
    if (Array.isArray(parsed.models)) {
      models = parsed.models;
    }
  } catch {
    models = [];
  }

  // =========================
  // 5. executePayload
  // =========================
  const executeResult = await runTool({
    name: "executePayload",
    args: {
      topic,
      models,
      trace_id: trace?.trace_id,
    },
    baseUrl,
    tenant_id,
  });

  // =========================
  // 6. validar data
  // =========================
  const data = executeResult?.data;

  const hasValidData =
    Array.isArray(data) &&
    data.some((x) => x && x.payload);

  if (!hasValidData) {
    return { message: "No hay información disponible" };
  }

  // =========================
  // 7. render
  // =========================
  const finalMessage = await render({
    message,
    data,
  });

  // =========================
  // 8. respuesta final
  // =========================
  return {
    message: finalMessage,
  };
}
