// api/chat.js

import executeNormal from "./execute.normal.js";
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
    // 1. DECIDE (HTTP interno + robusto)
    // =========================
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${req.headers.host}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let decision;

    try {
      const decideRes = await fetch(`${baseUrl}/api/decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!decideRes.ok) {
        throw new Error("decide_http_error");
      }

      decision = await decideRes.json();
    } catch (e) {
      clearTimeout(timeout);

      const error =
        e.name === "AbortError" ? "decide_timeout" : "decide_failed";

      return res.status(200).json({
        sessionId: "test-session",
        messages: history,
        error,
      });
    }

    if (!decision || !decision.topic) {
      return res.status(200).json({
        sessionId: "test-session",
        messages: history,
        error: "decide_invalid",
      });
    }

    const topic = decision.topic;
    const models = Array.isArray(decision.models) ? decision.models : [];

    // =========================
    // 2. EXECUTE
    // =========================
    const execResponse = await executeNormal({
      trace_id: `trace_${Date.now()}_${Math.random()}`,
      topic,
      models,
    });

    const data = execResponse?.data || [];

    if (!data.length) {
      return res.status(200).json({
        sessionId: "test-session",
        messages: history,
        error: "backend_error",
      });
    }

    // =========================
    // 3. RENDER
    // =========================
    const content = await render(data, message);

    const now = Date.now();

    history.push({
      id: `msg_${now}_user`,
      role: "user",
      content: message,
      timestamp: now,
    });

    history.push({
      id: `msg_${now}_assistant`,
      role: "assistant",
      content,
      timestamp: Date.now(),
    });

    // mantener pares
    if (history.length > 50) history.splice(0, 2);

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
