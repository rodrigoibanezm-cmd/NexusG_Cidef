// PATH: lib/telemetry/log_event_v1.ts
// LINES: 74

import { rpushJson } from "../upstash/client";

export type DecisionStateFinal =
  | "OK"
  | "OK_PARCIAL"
  | "NO_DATA"
  | "CONFLICT"
  | "OFF_SCOPE";

export type TelemetryEventV1 = {
  trace_id: string;
  user_id: string;
  timestamp: string;

  decision_state_final: DecisionStateFinal;

  models: string[];
  topic: string | null;
  intent: string | null;

  keys_used: string[];
  paths_used: string[];

  partial: boolean;
  blocked_reason: string | null;
};

type LogEventArgs = Omit<TelemetryEventV1, "timestamp"> & {
  timestamp?: string;
};

const EVENT_LOG_KEY = "cidef:event_log:v1";

export async function logEventV1(args: LogEventArgs): Promise<void> {
  const evt: TelemetryEventV1 = {
    timestamp: args.timestamp ?? new Date().toISOString(),
    trace_id: args.trace_id,
    user_id: args.user_id,

    decision_state_final: args.decision_state_final,

    models: Array.isArray(args.models) ? args.models : [],
    topic: args.topic ?? null,
    intent: args.intent ?? null,

    keys_used: Array.isArray(args.keys_used) ? args.keys_used : [],
    paths_used: Array.isArray(args.paths_used) ? args.paths_used : [],

    partial: Boolean(args.partial),
    blocked_reason: args.blocked_reason ?? null,
  };

  await rpushJson(EVENT_LOG_KEY, evt);
}
