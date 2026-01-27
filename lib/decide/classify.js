// PATH: /lib/decide/classify.js
// LINES: ~110
export const MAP_KEYS = {
  cliente: "mapa:cliente:light",
  comercial: "mapa:comercial:light",
  tecnico: "mapa:tecnico:light",
  mitos: "mapa:mitos:light"
};

const hasAny = (q, arr) => arr.some((x) => q.includes(x));

export function detectDecisionType(q) {
  const mitosKw = ["mito", "mitos", "china", "chino", "repuesto", "postventa", "durabilidad", "incendio", "carga", "autonomia", "autonomía", "bateria", "batería"];
  const compKw = [" vs ", "versus", "compar", "diferencia", "cuál tiene", "cual tiene", "más ", " mas ", "mejor"];
  const recoKw = ["recom", "qué auto", "que auto", "me conviene", "para "];

  if (hasAny(q, mitosKw)) return "mitos";
  if (hasAny(q, compKw)) return "comparativa";
  if (hasAny(q, recoKw)) return "recomendacion";
  return "informativa";
}

export function detectUseCase(q) {
  if (q.includes("taxi")) return "taxi";
  if (q.includes("uber")) return "uber";
  if (q.includes("flota")) return "flota";
  if (hasAny(q, ["viaje", "viajes", "carretera", "largo"])) return "viajes";
  if (hasAny(q, ["ciudad", "urbano"])) return "ciudad";
  if (hasAny(q, ["familia", "niñ", "nino", "niño", "niños", "7 asientos"])) return "familia";
  return null;
}

export function detectMitosUseCase(q) {
  const isChina = hasAny(q, ["china", "chino", "chinos"]);
  const isEv = hasAny(q, ["ev", "eléctr", "electr", "carga", "autonomia", "autonomía", "bateria", "batería"]);
  if (isChina && isEv) return "china_ev";
  if (isChina) return "china";
  if (isEv) return "ev";
  return null;
}

export function pickTopic(decision_type, q) {
  if (decision_type === "mitos") return "mitos";
  if (decision_type === "comparativa") return "ficha";

  const techKw = ["airbag", "hp", "torque", "asientos", "maletero", "traccion", "4x4", "autonomia", "bateria"];
  if (hasAny(q, techKw)) return "ficha";

  // default comercial
  return "comercial";
}

export function decideRequestedMaps(decision_type, topic) {
  if (decision_type === "mitos") return [MAP_KEYS.mitos];
  if (decision_type === "comparativa") return [MAP_KEYS.tecnico];
  if (decision_type === "recomendacion") return [MAP_KEYS.cliente, MAP_KEYS.comercial, MAP_KEYS.tecnico];

  // informativa
  if (topic === "ficha") return [MAP_KEYS.tecnico];
  if (topic === "cliente") return [MAP_KEYS.cliente];
  return [MAP_KEYS.comercial];
}
