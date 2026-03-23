// /core/trace.js

import crypto from "crypto";

export function createTrace(input) {
  const now = Date.now();

  return {
    trace_id: crypto.randomUUID(),
    input,
    started_at: now,
    finished_at: null,
    duration_ms: null,

    state: {
      current: "START",
      previous: null,
    },

    steps: [],
    output: null,
    error: null,

    meta: {
      iteration_count: 0,
      tool_call_count: 0,
      llm_call_count: 0,
      version: "1.0.0",
    },
  };
}

export function addStep(trace, step) {
  if (!trace || !Array.isArray(trace.steps)) return;

  trace.steps.push({
    ts: Date.now(),
    index: trace.steps.length,
    ...safeClone(step),
  });
}

export function setState(trace, nextState, extra = {}) {
  if (!trace?.state) return;

  const previous = trace.state.current;
  trace.state.previous = previous;
  trace.state.current = nextState;

  addStep(trace, {
    type: "state_transition",
    from: previous,
    to: nextState,
    ...safeClone(extra),
  });
}

export function incrementIteration(trace) {
  if (!trace?.meta) return;
  trace.meta.iteration_count += 1;
}

export function addLLMRequest(trace, messages) {
  if (!trace?.meta) return;

  trace.meta.llm_call_count += 1;

  addStep(trace, {
    type: "llm_request",
    message_count: Array.isArray(messages) ? messages.length : 0,
    messages: summarizeMessages(messages),
  });
}

export function addLLMResponse(trace, llmResponse) {
  const toolCalls = normalizeToolCalls(llmResponse?.tool_calls);

  addStep(trace, {
    type: "llm_response",
    role: llmResponse?.role || "assistant",
    content: llmResponse?.content || "",
    has_content: Boolean(llmResponse?.content && llmResponse.content.trim()),
    tool_calls: toolCalls,
    raw: safeClone(llmResponse),
  });
}

export function addToolCall(trace, { name, args, toolCallId, state }) {
  if (!trace?.meta) return;

  trace.meta.tool_call_count += 1;

  addStep(trace, {
    type: "tool_call",
    state: state || trace?.state?.current || null,
    name: name || null,
    tool_call_id: toolCallId || null,
    args: safeClone(args || {}),
  });
}

export function addToolResult(trace, { name, result, state, ok = true }) {
  addStep(trace, {
    type: "tool_result",
    state: state || trace?.state?.current || null,
    name: name || null,
    ok,
    result: safeClone(result),
  });
}

export function addDecision(trace, decision) {
  addStep(trace, {
    type: "decision",
    ...safeClone(decision),
  });
}

export function addNote(trace, message, extra = {}) {
  addStep(trace, {
    type: "note",
    message,
    ...safeClone(extra),
  });
}

export function setOutput(trace, output) {
  if (!trace) return;

  trace.output = {
    ts: Date.now(),
    ...safeClone(output),
  };

  finalizeTrace(trace);
}

export function setError(trace, error, extra = {}) {
  if (!trace) return;

  trace.error = {
    ts: Date.now(),
    name: error?.name || "Error",
    message: error?.message || "Unknown error",
    stack: error?.stack || null,
    step_index: Array.isArray(trace.steps) ? trace.steps.length - 1 : null,
    state: trace?.state?.current || null,
    ...safeClone(extra),
  };

  finalizeTrace(trace);
}

export function finalizeTrace(trace) {
  if (!trace || trace.finished_at) return;

  trace.finished_at = Date.now();
  trace.duration_ms = trace.finished_at - (trace.started_at || trace.finished_at);
}

export function toSerializableTrace(trace) {
  return JSON.parse(JSON.stringify(trace));
}

// =========================
// Helpers
// =========================

function normalizeToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls)) return [];

  return toolCalls.map((toolCall) => ({
    id: toolCall?.id || null,
    type: toolCall?.type || "function",
    name: toolCall?.function?.name || toolCall?.name || null,
    arguments:
      toolCall?.function?.arguments ||
      toolCall?.arguments ||
      null,
  }));
}

function summarizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages.map((m) => ({
    role: m?.role || null,
    content_preview:
      typeof m?.content === "string"
        ? m.content.slice(0, 500)
        : stringifySafe(m?.content).slice(0, 500),
    tool_call_id: m?.tool_call_id || null,
    has_tool_calls: Array.isArray(m?.tool_calls) && m.tool_calls.length > 0,
  }));
}

function safeClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { _unserializable: true };
  }
}

function stringifySafe(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
