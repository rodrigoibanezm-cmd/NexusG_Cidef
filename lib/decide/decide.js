// PATH: /lib/decide/decide.js
// LINES: ~170

import { upstashGetJson, unwrapMap } from "./upstash.js";
import { MAP_KEYS, decideRequestedMaps, detectDecisionType, detectUseCase, detectMitosUseCase, pickTopic } from "./classify.js";

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

async function loadMap(mapKey) {
  const raw = await upstashGetJson(mapKey);
  const arr = unwrapMap(raw, mapKey);
  return safeArray(arr);
}

/**
 * /api/decide:
 * - NO selecciona modelos
 * - SOLO: decision_type/topic/use_case + requested_maps + maps(light) crudos
 */
export async function decide({ trace_id, text, debug }) {
  const q = String(text ?? "").toLowerCase();

  const decision_type = detectDecisionType(q);
  const topic = pickTopic(decision_type, q);

  // use_case
  const use_case =
    decision_type === "mitos"
      ? detectMitosUseCase(q) // china | ev | china_ev | null
      : detectUseCase(q);     // familia/taxi/uber/flota/viajes/ciudad/null

  // qué mapas traer (mínimo)
  const requested_maps = decideRequestedMaps(decision_type, topic);

  // traer SOLO esos maps (backend), sin scoring, sin interpretación
  const maps = {};

  for (const k of requested_maps) {
    maps[k] = await loadMap(k);
  }

  // output estable (sin selected_models)
  const out = {
    trace_id,
    decision_type,
    topic,
    use_case,
    requested_maps,
    maps
  };

  if (debug) {
    out.debug = {
      maps_meta: Object.fromEntries(
        requested_maps.map((k) => [k, Array.isArray(maps[k]) ? maps[k].length : 0])
      )
    };
  }

  return out;
}
