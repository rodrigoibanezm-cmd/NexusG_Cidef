// PATH: lib/render/render_bullets_v1.ts
// LINES: 95

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
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return null;
}

export function firstTruthy(...args: unknown[]): string | null {
  for (const v of args) {
    const txt = safeText(v);
    if (txt) return txt;
  }
  return null;
}

// Nuevo helper recursivo para cualquier objeto o array
function flattenData(prefix: string, data: any, bullets: string[]) {
  if (data == null) return;
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    bullets.push(`${prefix}: ${safeText(data)}`);
  } else if (Array.isArray(data)) {
    data.forEach((item, idx) => flattenData(`${prefix}[${idx}]`, item, bullets));
  } else if (typeof data === "object") {
    Object.entries(data).forEach(([k, v]) => flattenData(`${prefix}.${k}`, v, bullets));
  }
}

export function renderBullets(op: Curatable): string[] {
  const bullets: string[] = [];
  const buckets: (keyof Curatable)[] = ["ficha", "comercial", "cliente", "mitos"];

  for (const bucket of buckets) {
    const data = op[bucket];
    if (!data) continue;

    try {
      flattenData(bucket, data, bullets);
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

// Export como renderBulletsV1 para coincidir con import en pipeline
export { renderBullets as renderBulletsV1 };
