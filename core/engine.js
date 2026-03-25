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
    console.log("ENGINE START:", { message });

    // =========================
    // 1. LLM → decide (maps)
    // =========================
    const decideRaw = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    console.log("DECIDE RAW:", decideRaw?.content);

    const decision = safeParseJSON(decideRaw?.content);

    console.log("DECISION PARSED:", decision);

    if (!decision || !Array.isArray(decision.maps)) {
      throw new Error("Invalid LLM JSON (decide)");
    }

    const maps = decision.maps;

    console.log("MAPS DETECTED:", maps);

    addNote(trace, "maps_detected", { maps });

    if (maps.length === 0) {
      console.log("EARLY EXIT: no_maps");
      addNote(trace, "early_exit", { reason: "no_maps" });
      return { message: "No hay información disponible" };
    }

    const topic = maps[0];

    console.log("TOPIC SELECTED:", topic);

    if (!VALID_TOPICS.includes(topic)) {
      throw new Error("Invalid topic");
    }

    // =========================
    // 2. decideMaps (backend)
    // =========================
    console.log("CALL decideMaps:", { maps });

    const decideResult = await runTool({
      name: "decideMaps",
      args: {
        requested_maps: maps,
        trace_id: trace?.trace_id,
      },
      baseUrl,
      tenant_id,
    });

    console.log("DECIDE RESULT:", decideResult);

    const mapsData = decideResult?.maps || {};

    console.log("MAPS DATA KEYS:", Object.keys(mapsData));

    addNote(trace, "maps_resolved", {
      keys: Object.keys(mapsData),
    });

    // =========================
    // 3. SELECT MODELS
    // =========================
    let models = [];

    const requiresModels = ["cliente", "comercial", "ficha", "mitos"].includes(topic);

    console.log("REQUIRES MODELS:", requiresModels);

    if (requiresModels) {
      try {
        models = await selectModels({
          message,
          maps: mapsData,
        });

        console.log("MODELS SELECTED:", models);

        addNote(trace, "models_selected", {
          count: models.length,
          models: models.slice(0, 3),
        });

      } catch (e) {
        console.log("SELECTOR ERROR:", e?.message);

        addNote(trace, "selector_error", {
          message: e.message,
        });

        models = [];
      }

      if (!models.length) {
        console.log("MODELS EMPTY");
        addNote(trace, "models_empty", {});
      }
    }

    // =========================
    // 4. execute
    // =========================
    console.log("CALL executePayload:", {
      topic,
      models,
    });

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

    console.log("HAS VALID DATA:", hasValidData);

    addNote(trace, "execute_result", {
      hasData: hasValidData,
      count: Array.isArray(data) ? data.length : 0,
    });

    if (!hasValidData) {
      console.log("EARLY EXIT: no_data");
      addNote(trace, "early_exit", { reason: "no_data" });
      return { message: "No hay información disponible" };
    }

    // =========================
    // 5. render
    // =========================
    console.log("CALL RENDER");

    const finalMessage = await render({
      message,
      data,
    });

    console.log("RENDER RESULT LENGTH:", finalMessage?.length);
    console.log("RENDER PREVIEW:", finalMessage?.slice(0, 200));

    addNote(trace, "render_complete", {
      hasMessage: !!finalMessage,
      length: finalMessage?.length || 0,
    });

    console.log("ENGINE SUCCESS");

    return {
      message: finalMessage || "No hay información disponible",
    };

  } catch (e) {
    console.error("ENGINE ERROR:", e?.message, e?.stack);

    addNote(trace, "engine_error", {
      message: e?.message,
      stack: e?.stack,
    });

    return {
      message: e?.message || "Error interno del sistema",
    };
  }
}
