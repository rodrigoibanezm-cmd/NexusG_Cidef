// /api/chat.js

import { systemPrompt } from "../services/llm/systemPrompt.js";

export default async function handler(req, res) {
  return res.status(200).json({
    step: "systemPrompt_loaded",
    ok: true,
  });
}
