// /core/engine.js

import { callLLM } from "../services/llm/callLLM.js";
import { runTool } from "../services/tools.js";
import { render } from "../services/llm/render.js";
import { selectModels } from "../services/selector/selectModels.js";
import { prepareData } from "../services/llm/prepareData.js";

import { addNote } from "./trace.js";

const VALID_TOPICS = ["cliente", "comercial", "ficha", "mitos"];
const NO_DATA_MESSAGE = "No hay información disponible.";
const MAX_MODELS = 2;

// =========================
// PARSE JSON ROBUSTO
// =========================
function safeParseJSON(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  return null;
}

// =========================
// EXTRAER PAYLOAD LIMPIO
// =========================
function extractPayload(data = []) {
  return data
    .map((x) => x?.payload)
    .filter((x) => x && x.modelo);
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

    const decision = safeParseJSON(decideRaw?.content);

    if (!decision || !Array.isArray(decision.maps)) {
      throw new Error("INVALID_DECIDE_JSON");
    }

    const maps = [...new Set(
      decision.maps.filter((x) => VALID_TOPICS.includes(x))
    )];

    const intent = {
      requires_tech: true,
      ...(decision.intent || {})
    };

    addNote(trace, "maps_detected", { maps });

    if (maps.length === 0) {
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

    // =========================
    // 3. SELECT MODELS
    // =========================
    let models = [];

    try {
      models = await selectModels({
        message,
        maps: mapsData,
      });
    } catch {
      models = [];
    }

    models = models.slice(0, MAX_MODELS);

    // 🔒 EARLY EXIT MODELOS
    if (models.length === 0) {
      return { message: NO_DATA_MESSAGE };
    }

    addNote(trace, "models_selected", {
      count: models.length,
      models,
    });

    // =========================
    // 4. EXECUTE (PARALLEL)
    // =========================
    const results = await Promise.all(
      maps.map((topic) =>
        runTool({
          name: "executePayload",
          args: {
            topic,
            models,
            trace_id: trace?.trace_id,
          },
          baseUrl,
          tenant_id,
        })
      )
    );

    let allData = [];

    for (const r of results) {
      if (Array.isArray(r?.data)) {
        allData.push(...extractPayload(r.data));
      }
    }

    const hasValidData = allData.length > 0;

    addNote(trace, "execute_result", {
      hasData: hasValidData,
      count: allData.length,
    });

    if (!hasValidData) {
      return { message: NO_DATA_MESSAGE };
    }

    // =========================
    // 5. PREPARE
    // =========================
    let preparedData = prepareData(allData, maps, intent);

    // =========================
    // 6. GUARDRAIL PAYLOAD
    // =========================
    const payloadSize = Buffer.byteLength(JSON.stringify(preparedData));

    if (process.env.NODE_ENV !== "production") {
      console.log("PAYLOAD SIZE:", payloadSize);
    }

    if (payloadSize > 8000) {
      preparedData = preparedData.slice(0, 1);
    }

    // =========================
    // 7. RENDER
    // =========================
    const finalMessage = await render({
      message,
      data: preparedData,
      maps,
      tenantId: tenant_id || "default",
    });

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
