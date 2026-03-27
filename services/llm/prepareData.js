// /services/llm/prepareData.js

export function prepareData(data, maps = [], intent = {}) {
  // 🔥 FIX: ficha siempre incluye técnica salvo que se desactive explícitamente
  const includeTech =
    maps.includes("ficha") &&
    (intent.requires_tech !== false);

  return data.map(d => ({
    modelo: d.modelo,

    // técnico (solo si corresponde)
    ...(includeTech && {
      potencia: d.motor?.potencia_maxima_hp_rpm?.luxury_at ?? null,
      tipo_motor: d.motor?.tipo ?? null
    }),

    // cliente (máximo 1 escenario)
    ...(maps.includes("cliente") && {
      escenarios: d.escenarios_cliente
        ?.slice(0, 1)
        .map(e => ({
          uso: e.uso_tipico ?? null,
          valor: e.que_valora ?? null
        })) ?? []
    })
  }));
}
