// /api/chat.js

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
    // 1. DECIDE (HTTP interno correcto)
    // =========================
    const baseUrl = `https://${req.headers.host}`;

    const decideRes = await fetch(`${baseUrl}/api/decide`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const decision = await decideRes.json();

    const topics = decision?.topic ? [decision.topic] : ["ficha"];
    const models = Array.isArray(decision?.models) ? decision.models : [];

    // =========================
    // 2. EXECUTE
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
