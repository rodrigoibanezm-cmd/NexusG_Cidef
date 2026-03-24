// /api/chat.js

import { systemPrompt } from "../services/llm/systemPrompt.js";
import { runEngine } from "../core/engine.js";
import { validateAuth } from "../core/auth.js";
import { parseBody } from "../core/parseBody.js";

import {
  createTrace,
  addNote,
  setError,
  toSerializableTrace,
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
    return res.status(405).json({ error: "method_not_allowed" });
  }

  let trace = null;

  try {
    // =========================
    // AUTH
    // =========================
    const auth = await validateAuth(req);

    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const tenant_id = auth.tenant_id;

    // =========================
    // INPUT
    // =========================
    const parsed = parseBody(req);

    if (!parsed.ok) {
      return res.status(parsed.status).json({ error: parsed.error });
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
    // RESPONSE
    // =========================
    return res.status(200).json({
      message: result.message,
      trace:
        process.env.NODE_ENV === "development"
          ? toSerializableTrace(trace)
          : null,
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
      trace:
        process.env.NODE_ENV === "development"
          ? toSerializableTrace(trace)
          : null,
    });
  }
}
