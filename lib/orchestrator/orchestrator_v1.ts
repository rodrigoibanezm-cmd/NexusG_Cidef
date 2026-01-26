// PATH: lib/orchestrator/orchestrator_v1.ts
// LINES: 99

import { mgetJson } from "../upstash/client.js";

export type DecisionStateFinal =
  | "OK"
  | "OK_PARCIAL"
  | "NO_DATA"
  | "CONFLICT"
  | "OFF_SCOPE";

type IntakeResult = {
  decision_state?: DecisionStateFinal;
  models?: string[];
  topic?: string | null;
  intent?: string | null;
  operation_mode?: string | null;
};

type KeymapV1 = {
  ficha_tpl?: string; // e.g. "cidef:fichas:v1:ft_v1_{model}"
  comercial_tpl?: string;
  cliente_tpl?: string;
  mitos_tpl_by_topic?: Record<string, string>; // e.g. { ev:"cidef:mitos:v1:mitos_v1_ev" }
};

type RouterConfigV1 = {
  paths?: {
    ficha?: string[];
    comercial?: string[];
    cliente?: string[];
    mitos?: string[];
  };
};

export type JsonOperativoV1 = {
  decision_state_final: DecisionStateFinal;
  model: string | null;
  topic: string | null;
  intent: string | null;

  keys_used: string[];
  paths_used: string[];

  ficha: unknown | null;
  comercial: unknown | null;
  cliente: unknown | null;
  mitos: unknown | null;

  conflict: boolean;
  off_scope: boolean;
};

function tpl(t: string | undefined, model: string): string | null {
  if (!t) return null;
  return t.replaceAll("{model}", model);
}

function pickByPaths(obj: any, paths: string[] | undefined): any {
  if (!obj || !paths || paths.length === 0) return obj;
  const out: any = {};
  for (const p of paths) {
    const parts = p.split(".").filter(Boolean);
    let src: any = obj;
    for (const part of parts) {
      if (src == null || typeof src !== "object") {
        src = undefined;
        break;
      }
      src = src[part];
    }
    if (src !== undefined) out[p] = src; // strict: guarda solo el path exacto
  }
  return out;
}

export async function orchestratorV1(args: {
  intake: IntakeResult;
  keymap: KeymapV1;
  router_config: RouterConfigV1;
}): Promise<JsonOperativoV1> {
  const { intake, keymap, router_config } = args;

  if (intake.decision_state === "OFF_SCOPE") {
    return {
      decision_state_final: "OFF_SCOPE",
      model: null,
      topic: intake.topic ?? null,
      intent: intake.intent ?? null,
      keys_used: [],
      paths_used: [],
      ficha: null,
      comercial: null,
      cliente: null,
      mitos: null,
      conflict: false,
      off_scope: true,
    };
  }

  const model = (intake.models && intake.models[0]) || null;
  const topic = intake.topic ?? null;

  const keys: string[] = [];
  const kFicha = model ? tpl(keymap.ficha_tpl, model) : null;
  const kCom = model ? tpl(keymap.comercial_tpl, model) : null;
  const kCli = model ? tpl(keymap.cliente_tpl, model) : null;

  if (kFicha) keys.push(kFicha);
  if (kCom) keys.push(kCom);
  if (kCli) keys.push(kCli);

  // Máx 2 keys + 1 mitos (V1): prioriza ficha + comercial; cliente entra solo si sobra.
  const baseKeys = keys.filter(Boolean).slice(0, 2);

  const kMitos =
    (topic && keymap.mitos_tpl_by_topic?.[topic]) ||
    (topic === "china" ? keymap.mitos_tpl_by_topic?.["china"] : null) ||
    null;

  const finalKeys = kMitos ? [...baseKeys, kMitos] : baseKeys;
  const values = await mgetJson(finalKeys);

  const [raw0, raw1, rawM] = values;

  const ficha = pickByPaths(raw0, router_config.paths?.ficha);
  const comercial = pickByPaths(raw1, router_config.paths?.comercial);
  const mitos = pickByPaths(rawM, router_config.paths?.mitos);

  const paths_used = [
    ...(router_config.paths?.ficha ?? []),
    ...(router_config.paths?.comercial ?? []),
    ...(router_config.paths?.mitos ?? []),
  ];

  return {
    decision_state_final: "OK", // el curador semántico lo ajusta (OK/OK_PARCIAL/NO_DATA)
    model,
    topic,
    intent: intake.intent ?? null,
    keys_used: finalKeys,
    paths_used,
    ficha: ficha ?? null,
    comercial: comercial ?? null,
    cliente: null,
    mitos: mitos ?? null,
    conflict: false,
    off_scope: false,
  };
}
