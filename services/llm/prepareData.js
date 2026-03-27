// /services/llm/prepareData.js

export function prepareData(data, maps = [], intent = {}) {
  const includeTech = maps.includes("ficha") && intent.requires_tech;

  return data.map(d => ({
    modelo: d.modelo,

    // técnico (solo si realmente se requiere)
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
        }))
    })
  }));
}
