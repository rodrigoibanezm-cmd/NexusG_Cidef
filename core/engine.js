/core/engine.js

import { createContext } from "./context.js";
import { callLLM } from "../services/llm.js";
import { runTool } from "../services/tools.js";

export async function runAgent({ message, req, systemPrompt }) {
const context = createContext({ message, systemPrompt });

const protocol = req.headers["x-forwarded-proto"] || "https";
const baseUrl = `${protocol}://${req.headers.host}`;

let steps = 0;

while (steps++ < 8) {
const llmResponse = await callLLM(context.messages);

```
if (!llmResponse) {
  throw new Error("LLM returned null response");
}

context.messages.push(llmResponse);

const toolCalls = llmResponse.tool_calls || [];
const hasTools = toolCalls.length > 0;
const content = llmResponse.content;
const hasContent = content && content.trim() !== "";

// =========================
// STATE: START
// =========================
if (context.state === "START") {
  if (!hasTools) {
    throw new Error("Invalid: START must call decideMaps");
  }

  if (toolCalls.length !== 1) {
    throw new Error("Invalid: only 1 tool_call allowed per step");
  }

  const name = toolCalls[0].function?.name || toolCalls[0].name;
  if (name !== "decideMaps") {
    throw new Error("Invalid transition: START → " + name);
  }
}

// =========================
// TOOL EXECUTION
// =========================
if (hasTools) {
  if (toolCalls.length !== 1) {
    throw new Error("Invalid: multiple tool_calls not allowed");
  }

  const toolCall = toolCalls[0];
  const name = toolCall.function?.name || toolCall.name;

  // -------- VALIDACIÓN DE TRANSICIÓN --------
  if (context.state === "START" && name !== "decideMaps") {
    throw new Error("Invalid transition: START → " + name);
  }

  if (
    context.state === "DECIDE_DONE" &&
    name !== "executePayload"
  ) {
    throw new Error("Invalid transition: DECIDE_DONE → " + name);
  }

  if (context.state === "EXECUTE_DONE") {
    throw new Error("Invalid: EXECUTE_DONE cannot call tools");
  }

  // -------- PARSE ARGS --------
  let args = {};
  try {
    const argsString =
      toolCall.function?.arguments || toolCall.arguments || "{}";
    args = JSON.parse(argsString);
  } catch {
    throw new Error("Invalid tool arguments JSON");
  }

  // -------- EXECUTE TOOL --------
  const result = await runTool({
    name,
    args,
    baseUrl,
  });

  context.messages.push({
    role: "tool",
    tool_call_id: toolCall.id,
    content: JSON.stringify(result),
  });

  context.lastTool = name;

  // -------- TRANSICIÓN DE ESTADO --------
  if (name === "decideMaps") {
    context.state = "DECIDE_DONE";

    const models = result?.models || [];
    context.mustExecute =
      Array.isArray(models) && models.length > 0;
  }

  if (name === "executePayload") {
    context.state = "EXECUTE_DONE";
  }

  continue;
}

// =========================
// STATE: DECIDE_DONE
// =========================
if (context.state === "DECIDE_DONE") {
  // 🔥 FIX: validar cierre temprano correctamente
  if (context.mustExecute) {
    throw new Error("Missing executePayload when models exist");
  }

  if (hasContent) {
    return { message: content };
  }

  throw new Error("Invalid: DECIDE_DONE must respond if no execute");
}

// =========================
// STATE: EXECUTE_DONE
// =========================
if (context.state === "EXECUTE_DONE") {
  if (!hasContent) {
    throw new Error("Invalid: EXECUTE_DONE must produce response");
  }

  return { message: content };
}

// =========================
// FALLBACK
// =========================
throw new Error("Invalid state reached: " + context.state);
```

}

throw new Error("Max steps exceeded");
}
