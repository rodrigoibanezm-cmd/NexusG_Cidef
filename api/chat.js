// /api/chat.js

import executeNormal from "./execute.normal.js";
import { decide } from "../services/llm/decide.js";

let history = [];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const message = body?.message;

    if (!message) {
      return res.status(200).json({
        sessionId: "test-session",
        messages: history,
        error: "validation_error",
      });
    }

    // 1. decidir dinámicamente
    const decision = await decide(message);

    // 2. ejecutar backend real
    const execResponse = await executeNormal({
      trace_id: `trace_${Date.now()}`,
      topic: decision.topic,
      models: decision.models,
    });

    // 3. por ahora devolvemos JSON (validar flujo)
    const content = JSON.stringify(execResponse.data);

    history.push({
      role: "user",
      content: message,
      timestamp: Date.now(),
    });

    history.push({
      role: "assistant",
      content,
      timestamp: Date.now(),
    });

    return res.status(200).json({
      sessionId: "test-session",
      messages: history,
      error: null,
    });
  } catch (err) {
    console.error("CHAT_ERROR:", err);

    return res.status(200).json({
      sessionId: "test-session",
      messages: history,
      error: "backend_error",
    });
  }
}
