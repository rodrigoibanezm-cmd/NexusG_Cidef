// /core/engine.js

import { callLLM } from "../services/llm/callLLM.js";
import { runTool } from "../services/tools.js";
import { render } from "../services/llm/render.js";

const VALID_TOPICS = ["cliente", "comercial", "ficha", "mitos"];

// =========================
// helper: parse robusto
// =========================
function safeParseJSON(raw) {
  if (!raw) return null;

  try {
    const clean = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(clean);
  } catch {
    return null;
  }
}

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
  // 1. LLM → decide (maps)
  // =========================
  const decideRaw = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);

  console.log("LLM DECIDE RAW:", decideRaw?.content);

  const decision = safeParseJSON(decideRaw?.content);

  console.log("DECISION:", decision);

  if (!decision || !Array.isArray(decision.maps)) {
    throw new Error("Invalid LLM JSON (decide)");
  }

  const maps = decision.maps;

  if (maps.length === 0) {
    console.log("NO MAPS");
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

  console.log("MAPS FOR LLM2:", decideResult.maps);

  // =========================
  // 3. EXTRAER model_id
  // =========================
  const modelIds =
    decideResult?.maps?.[topic]?.map((m) => m.model_id) || [];

  console.log("MODEL IDS:", modelIds);

  // =========================
  // 4. LLM → resolve models
  // =========================
  const modelRaw = await callLLM([
    {
      role: "system",
      content: `
Responde SOLO en JSON válido.

Formato:
{
  "models": []
}

Reglas:
- Usa MODELOS DISPONIBLES
- Si el mensaje contiene uno → inclúyelo
- Match flexible
- Si no hay → []
- No inventar modelos

Ejemplo:
"Mage" → ["mage"]
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

  console.log("LLM MODELS RAW:", modelRaw?.content);

  const parsedModels = safeParseJSON(modelRaw?.content);

  const models = Array.isArray(parsedModels?.models)
    ? parsedModels.models
    : [];

  console.log("MODELS:", models);

  // =========================
  // 5. execute
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

  const data = executeResult?.data;

  const hasValidData =
    Array.isArray(data) &&
    data.some((x) => x && x.payload);

  if (!hasValidData) {
    console.log("NO VALID DATA");
    return { message: "No hay información disponible" };
  }

  // =========================
  // 6. render
  // =========================
  const finalMessage = await render({
    message,
    data,
  });

  console.log("FINAL MESSAGE:", finalMessage);

  return {
    message: finalMessage || "No hay información disponible",
  };
}
