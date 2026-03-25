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

  if (!llmResponse || !llmResponse.content) {
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
    return {
      message: "No hay información disponible",
    };
  }

  const topic = maps[0];

  if (!VALID_TOPICS.includes(topic)) {
    throw new Error("Invalid topic");
  }

  // =========================
  // 2. decideMaps (contexto)
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
  // 3. LLM → resolver models
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

Reglas:
- Detectar modelos mencionados en el mensaje
- Considerar el contexto implícito de maps
- Si no hay modelo claro → []
- No inventar modelos
`,
    },
    { role: "user", content: message },
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
  // 4. executePayload
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

  console.log("EXECUTE RESULT:", executeResult);

  // =========================
  // 5. Validar data
  // =========================
  const data = executeResult?.data;

  const hasValidData =
    Array.isArray(data) &&
    data.some((x) => x && x.payload);

  if (!hasValidData) {
    return {
      message: "No hay información disponible",
    };
  }

  // =========================
  // 6. render
  // =========================
  const finalMessage = await render({
    message,
    data,
  });

  // =========================
  // 7. respuesta final
  // =========================
  return {
    message: finalMessage,
  };
}
