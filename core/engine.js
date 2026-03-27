// /core/engine.js

import { callLLM } from "../services/llm/callLLM.js";
import { runTool } from "../services/tools.js";
import { render } from "../services/llm/render.js";
import { selectModels } from "../services/selector/selectModels.js";
import { prepareData } from "../services/llm/prepareData.js"; // 🔥 NEW

import { addNote } from "./trace.js";

const VALID_TOPICS = ["cliente", "comercial", "ficha", "mitos"];
const NO_DATA_MESSAGE = "No hay información disponible.";

// =========================
// PARSE JSON ROBUSTO (simple)
// =========================
function safeParseJSON(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    const slice = raw.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {}
  }

  return null;
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
    // 1. DECIDE
    // =========================
    const decideRaw = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    console.log("DECIDE RAW:", decideRaw?.content);

    const decision = safeParseJSON(decideRaw?.content);

    if (!decision || !Array.isArray(decision.maps)) {
      throw new Error("INVALID_DECIDE_JSON");
    }

    const maps = [...new Set(
      decision.maps.filter((x) => VALID_TOPICS.includes(x))
    )];

    console.log("MAPS DETECTED:", maps);
    addNote(trace, "maps_detected", { maps });

    if (maps.length === 0) {
      console.log("EARLY EXIT: no_maps");
      addNote(trace, "early_exit", { reason: "no_maps" });

      return { message: NO_DATA_MESSAGE };
    }

    // =========================
    // 2. DECIDE MAPS
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

    console.log("MAPS DATA KEYS:", Object.keys(mapsData));

    addNote(trace, "maps_resolved", {
      keys: Object.keys(mapsData),
    });

    // =========================
    // 3. SELECT MODELS
    // =========================
    let models = [];

    try {
      models = await selectModels({
        message,
        maps: mapsData,
      });
    } catch (e) {
      console.log("SELECTOR ERROR:", e?.message);
      models = [];
    }

    console.log("MODELS SELECTED:", models);

    addNote(trace, "models_selected", {
      count: models.length,
      models: models.slice(0, 3),
    });

    // =========================
    // 4. EXECUTE MULTI-TOPIC
    // =========================
    let allData = [];

    for (const topic of maps) {
      console.log("EXECUTE TOPIC:", topic);

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

      if (Array.isArray(data)) {
        allData.push(...data);
      }
    }

    const hasValidData =
      Array.isArray(allData) &&
      allData.some((x) => x && x.payload);

    console.log("HAS VALID DATA:", hasValidData);

    addNote(trace, "execute_result", {
      hasData: hasValidData,
      count: allData.length,
    });

    if (!hasValidData) {
      console.log("EARLY EXIT: no_data");
      addNote(trace, "early_exit", { reason: "no_data" });

      return { message: NO_DATA_MESSAGE };
    }

    // =========================
    // 5. PREPARE (🔥 FIX REAL)
    // =========================
    const preparedData = prepareData(allData, maps, decision?.intent || {});

    // =========================
    // 6. RENDER
    // =========================
    const finalMessage = await render({
      message,
      data: preparedData, // 🔥 CAMBIO CLAVE
      maps,
      tenantId: tenant_id || "default",
    });

    console.log("ENGINE SUCCESS");

    return {
      message: finalMessage || NO_DATA_MESSAGE,
    };

  } catch (e) {
    console.error("ENGINE ERROR:", e);

    addNote(trace, "engine_error", {
      message: e?.message,
    });

    return {
      message: "Error interno del sistema",
    };
  }
}
