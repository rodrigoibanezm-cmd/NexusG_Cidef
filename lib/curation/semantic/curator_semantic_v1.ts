// PATH: lib/curation/semantic/curator_semantic_v1.ts
// LINES: 115

export type DecisionStateFinal =
  | "OK"
  | "OK_PARCIAL"
  | "NO_DATA"
  | "CONFLICT"
  | "OFF_SCOPE";

export type CuratorSemanticResult = {
  decision_state_final: DecisionStateFinal;
  partial: boolean;
  blocked_reason: string | null;
};

type Curatable = {
  decision_state_final?: DecisionStateFinal; // opcional: orquestador puede setear
  off_scope?: boolean;

  keys_used?: string[];
  paths_used?: string[];

  ficha?: unknown;
  comercial?: unknown;
  cliente?: unknown;
  mitos?: unknown;

  conflict?: boolean;
};

function hasAnyData(x: Curatable): boolean {
  return (
    x.ficha != null ||
    x.comercial != null ||
    x.cliente != null ||
    x.mitos != null
  );
}

function countDataBuckets(x: Curatable): number {
  let n = 0;
  if (x.ficha != null) n++;
  if (x.comercial != null) n++;
  if (x.cliente != null) n++;
  if (x.mitos != null) n++;
  return n;
}

export function curatorSemanticV1(op: unknown): CuratorSemanticResult {
  const x = (op ?? {}) as Curatable;

  // 1) Bloqueos duros
  if (x.off_scope === true || x.decision_state_final === "OFF_SCOPE") {
    return {
      decision_state_final: "OFF_SCOPE",
      partial: false,
      blocked_reason: "OFF_SCOPE",
    };
  }

  if (x.conflict === true || x.decision_state_final === "CONFLICT") {
    return {
      decision_state_final: "CONFLICT",
      partial: false,
      blocked_reason: "CONFLICT",
    };
  }

  // 2) Respetar OK / OK_PARCIAL si ya estaba seteado
  if (x.decision_state_final === "OK") {
    return { decision_state_final: "OK", partial: false, blocked_reason: null };
  }

  if (x.decision_state_final === "OK_PARCIAL") {
    return { decision_state_final: "OK_PARCIAL", partial: true, blocked_reason: null };
  }

  if (x.decision_state_final === "NO_DATA") {
    return { decision_state_final: "NO_DATA", partial: false, blocked_reason: "NO_DATA" };
  }

  // 3) Fallback: contar buckets
  const buckets = countDataBuckets(x);

  // NUEVO: si hay ficha y/o comercial, siempre OK
  if ((x.ficha != null || x.comercial != null) && buckets >= 1) {
    return {
      decision_state_final: "OK",
      partial: false,
      blocked_reason: null,
    };
  }

  // 1 bucket (solo cliente o mitos) => parcial
  if (buckets === 1) {
    return {
      decision_state_final: "OK_PARCIAL",
      partial: true,
      blocked_reason: null,
    };
  }

  // Sin datos
  return {
    decision_state_final: "NO_DATA",
    partial: false,
    blocked_reason: "NO_DATA",
  };
}
