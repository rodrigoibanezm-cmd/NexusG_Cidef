// /api/chat.js

import { systemPrompt } from "../services/llm/systemPrompt.js";
import { runRuntime } from "../core/chat/runtime.js";

export default async function handler(req, res) {
  return res.status(200).json({
    step: "runtime_loaded",
    ok: true,
  });
}
