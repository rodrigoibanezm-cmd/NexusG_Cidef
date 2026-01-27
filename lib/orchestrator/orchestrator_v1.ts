// PATH: lib/orchestrator/orchestrator_v1.ts
// LINES: 141

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
  topic?: string | null; // ficha | comercial | cliente | mitos
  intent?: string | null;
  operation_mode?: string | null;
};

type KeymapV1 = {
  version?: string;
  namespace?: string;
  layers?: {
    ficha?: Record<string, string>;
    comercial?: Record<string, string>;
    cliente?: Record<string, string>;
    mitos?: Record<string, string>; // ev | china | ev_china
  };
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

  // Sin modelo => NO_DATA controlado
  if (!model) {
    return {
      decision_state_final: "NO_DATA",
      model: null,
      topic,
      intent: intake.intent ?? null,
      keys_used: [],
      paths_used: [],
      ficha: null,
      comercial: null,
      cliente: null,
      mitos: null,
      conflict: false,
      off_scope: false,
    };
  }

  const kFicha = keymap.layers?.ficha?.[model] ?? null;
  const kCom = keymap.layers?.comercial?.[model] ?? null;
  const kCli = keymap.layers?.cliente?.[model] ?? null;

  // mitos: no depende de modelo
  const kMitos =
    (topic && keymap.layers?.mitos?.[topic]) ||
    (topic === "china" ? keymap.layers?.mitos?.["china"] : null) ||
    null;

  // Máx 2 keys + 1 mitos (V1), con prioridad según topic
  const baseKeys: string[] = [];
  if (topic === "cliente") {
    if (kCli) baseKeys.push(kCli);
    if (kCom) baseKeys.push(kCom);
    if (baseKeys.length < 2 && kFicha) baseKeys.push(kFicha);
  } else if (topic === "comercial") {
    if (kCom) baseKeys.push(kCom);
    if (kFicha) baseKeys.push(kFicha);
    if (baseKeys.length < 2 && kCli) baseKeys.push(kCli);
  } else {
    // ficha o null => ficha + comercial
    if (kFicha) baseKeys.push(kFicha);
    if (kCom) baseKeys.push(kCom);
    if (baseKeys.length < 2 && kCli) baseKeys.push(kCli);
  }

  const finalKeys = kMitos ? [...baseKeys.slice(0, 2), kMitos] : baseKeys.slice(0, 2);

  // Si no hay ninguna key para buscar, NO_DATA (controlado)
  if (finalKeys.length === 0) {
    return {
      decision_state_final: "NO_DATA",
      model,
      topic,
      intent: intake.intent ?? null,
      keys_used: [],
      paths_used: [],
      ficha: null,
      comercial: null,
      cliente: null,
      mitos: null,
      conflict: false,
      off_scope: false,
    };
  }

  const values = await mgetJson(finalKeys);
  const [raw0, raw1, rawM] = values;

  // NO_DATA controlado: nunca error interno por ausencia de datos
  if (!raw0 && !raw1 && !rawM) {
    return {
      decision_state_final: "NO_DATA",
      model,
      topic,
      intent: intake.intent ?? null,
      keys_used: finalKeys,
      paths_used: [],
      ficha: null,
      comercial: null,
      cliente: null,
      mitos: null,
      conflict: false,
      off_scope: false,
    };
  }

  // Map por prefijo de key (robusto al orden)
  const k0 = finalKeys[0] ?? "";
  const k1 = finalKeys[1] ?? "";

  const rawFicha =
    k0.includes("cidef:fichas:") ? raw0 : k1.includes("cidef:fichas:") ? raw1 : null;
  const rawCom =
    k0.includes("cidef:comercial:") ? raw0 : k1.includes("cidef:comercial:") ? raw1 : null;
  const rawCli =
    k0.includes("cidef:clientes:") ? raw0 : k1.includes("cidef:clientes:") ? raw1 : null;

  const ficha = pickByPaths(rawFicha, router_config.paths?.ficha);
  const comercial = pickByPaths(rawCom, router_config.paths?.comercial);
  const cliente = pickByPaths(rawCli, router_config.paths?.cliente);
  const mitos = pickByPaths(rawM, router_config.paths?.mitos);

  const paths_used = [
    ...(router_config.paths?.ficha ?? []),
    ...(router_config.paths?.comercial ?? []),
    ...(router_config.paths?.cliente ?? []),
    ...(router_config.paths?.mitos ?? []),
  ];

  const decision_state_final: DecisionStateFinal =
    ficha == null && comercial == null && cliente == null && mitos == null ? "NO_DATA" : "OK";

  return {
    decision_state_final,
    model,
    topic,
    intent: intake.intent ?? null,
    keys_used: finalKeys,
    paths_used,
    ficha: ficha ?? null,
    comercial: comercial ?? null,
    cliente: cliente ?? null,
    mitos: mitos ?? null,
    conflict: false,
    off_scope: false,
  };
}
