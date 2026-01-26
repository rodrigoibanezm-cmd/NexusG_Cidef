// PATH: lib/intake/detectors/intake_detectors.ts
// LINES: 142

import { Model, Topic, Intent } from "../types/intake_types"

// =========================
// DETECT MODELS
// =========================

export function detectModels(message: string): Model[] {
  const msg = message.toLowerCase()
  const models: Model[] = []

  if (msg.includes("t5 evo hev") || msg.includes("t5-evo-hev") || msg.includes("hev")) {
    models.push("t5_evo_hev")
  }
  if (msg.includes("t5 evo") || msg.includes("t5-evo")) {
    models.push("t5_evo")
  }
  if (msg.includes("t5l")) {
    models.push("t5l")
  }
  if (msg.includes("t5")) {
    models.push("t5")
  }
  if (msg.includes("foton v9") || msg.includes("v9")) {
    models.push("foton_v9")
  }
  if (msg.includes("s50") || msg.includes("s50 ev")) {
    models.push("s50_ev")
  }

  return Array.from(new Set(models))
}

// =========================
// DETECT TOPIC
// =========================

export function detectTopic(message: string): Topic {
  const msg = message.toLowerCase()

  if (msg.includes("ficha") || msg.includes("especificaciones") || msg.includes("motor")) {
    return "ficha"
  }
  if (msg.includes("precio") || msg.includes("financiamiento") || msg.includes("cuotas")) {
    return "comercial"
  }
  if (msg.includes("familia") || msg.includes("uso") || msg.includes("niños")) {
    return "cliente"
  }
  if (msg.includes("mito") || msg.includes("verdad") || msg.includes("dicen que")) {
    return "mitos"
  }

  return null
}

// =========================
// DETECT INTENT
// =========================

export function detectIntent(message: string): Intent {
  const msg = message.toLowerCase()

  if (msg.includes("seguro") || msg.includes("airbag") || msg.includes("seguridad")) {
    return "seguridad"
  }
  if (msg.includes("espacio") || msg.includes("maleta") || msg.includes("asientos")) {
    return "espacio"
  }
  if (msg.includes("consumo") || msg.includes("rendimiento")) {
    return "consumo"
  }
  if (msg.includes("garantia") || msg.includes("garantía")) {
    return "garantia"
  }
  if (msg.includes("eléctrico") || msg.includes("ev") || msg.includes("batería")) {
    return "ev"
  }
  if (msg.includes("precio") || msg.includes("valor")) {
    return "precio"
  }
  if (msg.includes("financiamiento") || msg.includes("crédito")) {
    return "financiamiento"
  }
  if (msg.includes("postventa") || msg.includes("servicio")) {
    return "postventa"
  }
  if (msg.includes("pantalla") || msg.includes("tecnología")) {
    return "tecnologia"
  }

  return "otro"
}
