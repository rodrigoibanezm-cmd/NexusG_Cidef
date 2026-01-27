// PATH: /lib/decide/scoring.js
// LINES: ~110
const norm = (s) => String(s ?? "").toLowerCase().trim();

function mapByModelo(arr) {
  const m = new Map();
  for (const it of arr ?? []) if (it?.modelo) m.set(norm(it.modelo), it);
  return m;
}

export function scoreModels({ use_case, maps }) {
  const scores = {};
  const matched = {};

  // inicializa por slugs vistos en maps (fallback)
  const slugs = new Set();
  for (const a of [...(maps.cliente ?? []), ...(maps.comercial ?? []), ...(maps.tecnico ?? [])]) {
    if (a?.modelo) slugs.add(a.modelo);
  }

  for (const label of slugs) {
    scores[label] = 0;
    matched[label] = [];
  }

  const comercial = mapByModelo(maps.comercial);
  const cliente = mapByModelo(maps.cliente);
  const tecnico = mapByModelo(maps.tecnico);

  for (const [label] of comercial) {
    const c = comercial.get(label);
    const cl = cliente.get(label);
    const t = tecnico.get(label);

    if (use_case && c?.usos?.includes(use_case)) {
      scores[label] += 3;
      matched[label].push(`comercial.usos:${use_case}`);
    }

    if (use_case && Array.isArray(cl?.perfiles_cliente)) {
      if (cl.perfiles_cliente.some((p) => norm(p).includes(use_case))) {
        scores[label] += 2;
        matched[label].push(`cliente.perfiles:${use_case}`);
      }
    }

    if ((use_case === "taxi" || use_case === "uber" || use_case === "flota") && Array.isArray(c?.tags)) {
      if (c.tags.includes("mi_taxi_electrico")) {
        scores[label] += 1;
        matched[label].push("comercial.tags:mi_taxi_electrico");
      }
    }

    if (t?.tecnico?.es_electrico === true && (use_case === "taxi" || use_case === "ciudad")) {
      scores[label] += 1;
      matched[label].push("tecnico.es_electrico:true");
    }
  }

  return { scores, matched };
}

export function pickTopModels(scores) {
  const entries = Object.entries(scores ?? {}).sort((a, b) => b[1] - a[1]);
  const best = entries[0]?.[1] ?? 0;
  if (best <= 0) return [];

  // top-1 o top-2 si empate
  return entries.filter(([, s]) => s === best).slice(0, 2).map(([label]) => label);
}
