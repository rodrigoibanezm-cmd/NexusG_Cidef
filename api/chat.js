import { systemPrompt } from "../services/llm/systemPrompt.js";
import { runRuntime } from "../core/chat/runtime.js";

import {
  createTrace,
  addNote,
  setError,
  toSerializableTrace,
} from "../core/trace.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { message } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "validation_error" });
  }

  const trace = createTrace({ message });

  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${req.headers.host}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    addNote(trace, "chat_start", { baseUrl });

    const result = await runRuntime({
      messages,
      trace,
      baseUrl,
    });

    return res.status(200).json({
      message: result.message,
      trace: toSerializableTrace(trace),
    });
  } catch (error) {
    console.error("CHAT_ERROR:", error);

    setError(trace, error, {
      reason: "unhandled_handler_error",
    });

    return res.status(200).json({
      message: "Error interno del sistema",
      trace: toSerializableTrace(trace),
    });
  }
}
