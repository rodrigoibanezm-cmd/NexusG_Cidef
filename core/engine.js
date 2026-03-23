/core/engine.js

import { createContext } from "./context.js";
import { callLLM } from "../services/llm.js";
import { runTool } from "../services/tools.js";

export async function runAgent({ message, req, systemPrompt, trace }) {
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
const hasContent =
  typeof content === "string" && content.trim() !== "";

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
    args: {
      ...args,
      trace_id: trace?.trace_id, // 🔥 FIX: alineado con schema
    },
    baseUrl,
  });

  context.messages.push({
    role: "tool",
    tool_call_id: toolCall.id,
    content: JSON.stringify(result),
  });

  context.lastTool = name;

  // =========================
  // TRANSICIONES
  // =========================

  if (name === "decideMaps") {
    context.state = "DECIDE_DONE";

    // 🔥 FIX: derivar desde maps (no models)
    const maps = result?.maps || {};

    const hasData =
      maps &&
      typeof maps === "object" &&
      Object.keys(maps).length > 0;

    context.mustExecute = hasData;
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
  if (context.mustExecute) {
    throw new Error("Missing executePayload when maps contain data");
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
