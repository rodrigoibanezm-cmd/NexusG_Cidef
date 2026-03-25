// /core/engine.js

import { callLLM } from "../services/llm/callLLM.js";
import { runTool } from "../services/tools.js";
import { render } from "../services/llm/render.js";
import { selectModels } from "../services/selector/selectModels.js";

import { addNote } from "./trace.js";

const VALID_TOPICS = ["cliente", "comercial", "ficha", "mitos"];

// =========================
// PARSE JSON ROBUSTO
// =========================
function safeParseJSON(raw) {
  if (!raw) return null;

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// =========================
// ENGINE
// =========================
export async function runEngine({
  message,
  req,
  systemPrompt,
  trace,
  tenant_id,
}) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${protocol}://${req.headers.host}`;

  try {
    // =========================
    // 1. LLM → decide (maps)
    // =========================
    const decideRaw = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    const decision = safeParseJSON(decideRaw?.content);

    if (!decision || !Array.isArray(decision.maps)) {
      throw new Error("Invalid LLM JSON (decide)");
    }

    const maps = decision.maps;

    addNote(trace, "maps_detected", { maps });

    if (maps.length === 0) {
      addNote(trace, "early_exit", { reason: "no_maps" });
      return { message: "No hay información disponible" };
    }

    const topic = maps[0]; // single-topic por ahora

    if (!VALID_TOPICS.includes(topic)) {
      throw new Error("Invalid topic");
    }

    // =========================
    // 2. decideMaps (backend)
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

    const mapsData = decideResult?.maps || {};

    addNote(trace, "maps_resolved", {
      keys: Object.keys(mapsData),
    });

    // =========================
    // 3. SELECT MODELS (solo si aplica)
    // =========================
    let models = [];

    const requiresModels = ["cliente", "comercial"].includes(topic);

    if (requiresModels) {
      try {
        models = await selectModels({
          message,
          maps: mapsData,
        });

        addNote(trace, "models_selected", {
          count: models.length,
          models: models.slice(0, 3),
        });

      } catch (e) {
        addNote(trace, "selector_error", {
          message: e.message,
        });

        models = []; // fallback resiliente
      }

      // ⚠️ ya NO hacemos early exit aquí
      // dejamos que execute decida si hay data o no
      if (!models.length) {
        addNote(trace, "models_empty", {});
      }
    }

    // =========================
    // 4. execute
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

    const data = executeResult?.data;

    const hasValidData =
      Array.isArray(data) &&
      data.some((x) => x && x.payload);

    addNote(trace, "execute_result", {
      hasData: hasValidData,
      count: Array.isArray(data) ? data.length : 0,
    });

    if (!hasValidData) {
      addNote(trace, "early_exit", { reason: "no_data" });
      return { message: "No hay información disponible" };
    }

    // =========================
    // 5. render
    // =========================
    const finalMessage = await render({
      message,
      data,
    });

    addNote(trace, "render_complete", {
      hasMessage: !!finalMessage,
      length: finalMessage?.length || 0,
    });

    return {
      message: finalMessage || "No hay información disponible",
    };

  } catch (e) {
    console.error("ENGINE ERROR:", e);

    addNote(trace, "engine_error", {
      message: e.message,
    });

    return { message: "Error interno del sistema" };
  }
}
