// PATH: lib/orchestrator/orchestrator_v1.ts
// LINES: 160

import { mgetJson } from "../upstash/client.js";
import type { KeymapV1, RouterConfigV1, IntakeResult, JsonOperativoV1 } from "./types.js";
import { pickByPaths } from "./utils.js";
import { selectKeysAndFlags, KeyFlagsResult } from "./key_selector_v1.js";

export type DecisionStateFinal =
  | "OK"
  | "OK_PARCIAL"
  | "NO_DATA"
  | "CONFLICT"
  | "OFF_SCOPE";

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

  // 🔹 Selección de keys y flags usando helper
  const keyFlags: KeyFlagsResult = selectKeysAndFlags({
    intent: intake.intent,
    topic,
    model,
    keymap,
  });

  const finalKeys = keyFlags.keys_used;

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

  // Map por prefijo de key (robusto al orden)
  const k0 = finalKeys[0] ?? "";
  const k1 = finalKeys[1] ?? "";

  const rawFicha =
    k0.includes("cidef:fichas:") ? raw0 : k1.includes("cidef:fichas:") ? raw1 : null;
  const rawCom =
    k0.includes("cidef:comercial:") ? raw0 : k1.includes("cidef:comercial:") ? raw1 : null;
  const rawCli =
    k0.includes("cidef:clientes:") ? raw0 : k1.includes("cidef:clientes:") ? raw1 : null;
  const rawM = kMitosFromKeys(finalKeys, values);

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

// 🔹 Función auxiliar para obtener key de mitos
function kMitosFromKeys(keys: string[], values: any[]): any {
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].includes("cidef:mitos:")) return values[i];
  }
  return null;
}
