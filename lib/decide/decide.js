// PATH: /lib/decide/decide.js
// LINES: ~40
import { upstashGetJson, unwrapMap } from "./upstash.js";
import { MAP_KEYS, decideRequestedMaps, detectDecisionType, detectUseCase, detectMitosUseCase, pickTopic } from "./classify.js";
import { extractModelMentions } from "./models.js";
import { scoreModels, pickTopModels } from "./scoring.js";

export async function decide({ trace_id, text, debug }) {
  const q = String(text ?? "").toLowerCase();

  const decision_type = detectDecisionType(q);
  const topic = pickTopic(decision_type, q);
  const requested_maps = decideRequestedMaps(decision_type, topic);

  const model_mentions = extractModelMentions(q);

  // mitos
  if (decision_type === "mitos") {
    const use_case = detectMitosUseCase(q);
    return {
      trace_id,
      decision_type: "mitos",
      topic: "mitos",
      selected_models: [],
      use_case,
      requested_maps,
      ...(debug ? { debug: { model_mentions } } : {})
    };
  }

  const use_case = detectUseCase(q);

  // si hay modelos explícitos, listo
  if (model_mentions.length > 0) {
    return {
      trace_id,
      decision_type,
      topic,
      selected_models: model_mentions,
      use_case,
      requested_maps,
      ...(debug ? { debug: { model_mentions } } : {})
    };
  }

  // recomendación sin menciones: scoring con maps
  if (decision_type === "recomendacion") {
    const maps = {
      cliente: unwrapMap(await upstashGetJson(MAP_KEYS.cliente), MAP_KEYS.cliente) ?? [],
      comercial: unwrapMap(await upstashGetJson(MAP_KEYS.comercial), MAP_KEYS.comercial) ?? [],
      tecnico: unwrapMap(await upstashGetJson(MAP_KEYS.tecnico), MAP_KEYS.tecnico) ?? []
    };

    const { scores, matched } = scoreModels({ use_case, maps });
    const selected_models = pickTopModels(scores);

    return {
      trace_id,
      decision_type,
      topic,
      selected_models,
      use_case,
      requested_maps,
      ...(debug ? { debug: { model_mentions, scores, matched } } : {})
    };
  }

  // informativa sin modelo: no adivinar
  return {
    trace_id,
    decision_type,
    topic,
    selected_models: [],
    use_case,
    requested_maps,
    ...(debug ? { debug: { model_mentions } } : {})
  };
}
