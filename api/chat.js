// /api/chat.js

import executeNormal from "./execute.normal.js";
import { decide } from "../services/llm/decide.js";
import { render } from "../services/llm/render.js";

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

    // =========================
    // 1. DECIDE
    // =========================
    const decision = await decide(message);

    const topics = Array.isArray(decision?.topics) && decision.topics.length
      ? decision.topics
      : ["ficha"];

    const models = ["mage"]; // 🔒 mantenemos controlado

    // =========================
    // 2. EXECUTE (MULTI-CAPA REAL)
    // =========================

    let allData = [];

    for (const topic of topics) {
      const execResponse = await executeNormal({
        trace_id: `trace_${Date.now()}_${topic}`,
        topic,
        models,
      });

      if (execResponse && execResponse.data) {
        allData = allData.concat(execResponse.data);
      }
    }

    // 🔥 validación
    if (!allData.length) {
      return res.status(200).json({
        sessionId: "test-session",
        messages: history,
        error: "backend_error",
      });
    }

    // =========================
    // 3. RENDER
    // =========================
    const content = await render(allData, message);

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
