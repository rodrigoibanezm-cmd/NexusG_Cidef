// PATH: lib/orchestrator/orchestrator_v1.ts
// LINES: 147

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
  topic?: string | null; // "ficha" | "comercial" | "cliente" | "mitos"
  intent?: string | null;
  operation_mode?: string | null;
};

type KeymapV1 = {
  // Se mantiene por compatibilidad, pero NO se usa para construir keys.
  ficha_tpl?: string;
  comercial_tpl?: string;
  cliente_tpl?: string;
  mitos_tpl_by_topic?: Record<string, string>;
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
    if (src !== undefined) out[p] = src;
  }
  return out;
}

// --- Key builders (fuente de verdad de nombres) ---
function keyFicha(model: string) {
  return `cidef:fichas:v1:ft_v1_${model}`;
}
function keyComercial(model: string) {
  return `cidef:comercial:v1:comercial_v1_${model}`;
}
function keyCliente(model: string) {
  return `cidef:clientes:v1:cliente_v1_${model}`;
}

// mitos: solo 3 literales
function keyMitos(topic: string | null): string | null {
  if (topic === "china") return "cidef:mitos:v1:mitos_v1_china";
  if (topic === "ev") return "cidef:mitos:v1:mitos_v1_ev";
  if (topic === "ev_china") return "cidef:mitos:v1:mitos_v1_ev_china";
  return null;
}

export async function orchestratorV1(args: {
  intake: IntakeResult;
  keymap: KeymapV1; // compat
  router_config: RouterConfigV1;
}): Promise<JsonOperativoV1> {
  const { intake, router_config } = args;

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

  // Sin modelo => NO_DATA (no error)
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

  // Base keys: máximo 2, según topic (prioridad)
  const baseKeys: string[] = [];
  if (topic === "ficha") {
    baseKeys.push(keyFicha(model), keyComercial(model));
  } else if (topic === "comercial") {
    baseKeys.push(keyComercial(model), keyFicha(model));
  } else if (topic === "cliente") {
    baseKeys.push(keyCliente(model), keyComercial(model));
  } else if (topic === "mitos") {
    // mitos no depende de modelo
  } else {
    // si no hay topic, mantenemos estándar: ficha + comercial
    baseKeys.push(keyFicha(model), keyComercial(model));
  }

  const kMitos = keyMitos(topic);
  const finalKeys = kMitos ? [...baseKeys.slice(0, 2), kMitos] : baseKeys.slice(0, 2);

  const values = await mgetJson(finalKeys);
  const [raw0, raw1, rawM] = values;

  // NO_DATA controlado: nunca PIPELINE_ERROR por keys mal construidas o faltantes
  const hasAny = Boolean(raw0 || raw1 || rawM);
  if (!hasAny) {
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

  // Asignación por orden de keys usadas
  // Nota: según topic, raw0/raw1 pueden ser ficha/comercial/cliente.
  const k0 = finalKeys[0] ?? "";
  const k1 = finalKeys[1] ?? "";

  const rawFicha = k0.includes("cidef:fichas:") ? raw0 : k1.includes("cidef:fichas:") ? raw1 : null;
  const rawCom = k0.includes("cidef:comercial:") ? raw0 : k1.includes("cidef:comercial:") ? raw1 : null;
  const rawCli = k0.includes("cidef:clientes:") ? raw0 : k1.includes("cidef:clientes:") ? raw1 : null;

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
