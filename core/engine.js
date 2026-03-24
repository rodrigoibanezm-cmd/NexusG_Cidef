// /core/engine.js

import { callLLM } from "../services/llm/callLLM.js";
import { runTool } from "../services/tools.js";

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
  // 1. LLM → JSON decisión
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

  // =========================
  // 2. Validación JSON
  // =========================
  if (
    !decision ||
    !Array.isArray(decision.maps) ||
    !Array.isArray(decision.models)
  ) {
    throw new Error("Invalid LLM JSON structure");
  }

  const maps = decision.maps;
  const models = decision.models;

  // =========================
  // 3. Caso sin maps
  // =========================
  if (maps.length === 0) {
    return {
      message: "No hay información disponible",
    };
  }

  const topic = maps[0]; // v1: primer map

  // =========================
  // 4. Validar topic
  // =========================
  if (!VALID_TOPICS.includes(topic)) {
    throw new Error("Invalid topic");
  }

  // =========================
  // 5. decideMaps
  // =========================
  // Nota:
  // decideMaps se ejecuta por validación y contrato de arquitectura.
  // No se utiliza directamente en v1, pero asegura consistencia,
  // trazabilidad y compatibilidad con el agente GPT.
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
  // 6. executePayload
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
  // 7. Validar respuesta execute
  // =========================
  const data = executeResult?.data;

  const hasValidData =
    Array.isArray(data) && data.some((x) => x !== null);

  if (!hasValidData) {
    return {
      message: "No hay información disponible",
    };
  }

  // =========================
  // 8. Respuesta final
  // =========================
  return {
    message: JSON.stringify(executeResult),
  };
}
