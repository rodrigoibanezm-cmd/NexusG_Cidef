// PATH: lib/render/render_bullets_v1.ts
// LINES: 75

type Curatable = {
  ficha?: any;
  comercial?: any;
  cliente?: any;
  mitos?: any;
};

export function safeText(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toString();
  if (typeof v === "boolean") return v ? "Sí" : "No"; // boolean fix
  return null;
}

export function firstTruthy(...args: unknown[]): string | null {
  for (const v of args) {
    const txt = safeText(v);
    if (txt) return txt;
  }
  return null;
}

export function renderBullets(op: Curatable): string[] {
  const bullets: string[] = [];

  const buckets: (keyof Curatable)[] = ["ficha", "comercial", "cliente", "mitos"];

  for (const bucket of buckets) {
    const data = op[bucket];
    if (!data) continue;

    try {
      for (const [key, value] of Object.entries(data)) {
        const txt = safeText(value);
        if (txt) bullets.push(`${key}: ${txt}`);
      }
    } catch (e) {
      bullets.push(`Error renderizando ${bucket}`);
    }
  }

  // Fallback: si no hay bullets pero hay data
  if (bullets.length === 0 && (op.ficha || op.comercial || op.cliente || op.mitos)) {
    bullets.push("Hay información disponible, pero no se pudo renderizar en bullets.");
  }

  return bullets;
}

// Export como renderBulletsV1 para que coincida con import en pipeline
export { renderBullets as renderBulletsV1 };
