// /api/chat.js

import { systemPrompt } from "../services/llm/systemPrompt.js";
import { runEngine } from "../core/engine.js";
import { parseBody } from "../core/parseBody.js";

import {
  createTrace,
  addNote,
  setError,
} from "../core/trace.js";

export default async function handler(req, res) {
  // =========================
  // CORS
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-tenant-id, x-api-key"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "method_not_allowed",
    });
  }

  let trace = null;

  try {
    // =========================
    // AUTH OFF (piloto)
    // =========================
    const tenant_id = null; // TODO: activar multi-tenant

    // =========================
    // INPUT
    // =========================
    const parsed = parseBody(req);

    if (!parsed.ok) {
      return res.status(parsed.status).json({
        message: parsed.error,
      });
    }

    const { message } = parsed;

    // =========================
    // TRACE
    // =========================
    trace = createTrace({
      message,
      tenant_id,
    });

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${req.headers.host}`;

    addNote(trace, "chat_start", {
      baseUrl,
      tenant_id,
    });

    // =========================
    // ENGINE
    // =========================
    const result = await runEngine({
      message,
      req,
      systemPrompt,
      trace,
      tenant_id,
    });

    // =========================
    // VALIDACIÓN ENGINE (CRÍTICO)
    // =========================
    if (!result || typeof result.message !== "string") {
      console.error("INVALID ENGINE RESPONSE:", result);

      return res.status(200).json({
        message: "No hay información disponible",
      });
    }

    // =========================
    // LOG SEGURO
    // =========================
    console.log("CHAT RESPONSE:", {
      length: result.message.length,
    });

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      message: result.message,
    });

  } catch (error) {
    console.error("CHAT_ERROR:", error);

    if (trace) {
      setError(trace, error, {
        reason: "unhandled_handler_error",
      });
    }

    return res.status(500).json({
      message: "Error interno del sistema",
    });
  }
}
