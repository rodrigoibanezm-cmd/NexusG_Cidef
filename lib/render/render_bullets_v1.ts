// PATH: lib/curator/render_bullets_v1.ts
// LINES: 65

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
  if (typeof v === "boolean") return v ? "Sí" : "No"; // FIX: booleans ahora se renderizan
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

  // Ficha
  if (op.ficha) {
    for (const [key, value] of Object.entries(op.ficha)) {
      const txt = safeText(value);
      if (txt) bullets.push(`${key}: ${txt}`);
    }
  }

  // Comercial
  if (op.comercial) {
    for (const [key, value] of Object.entries(op.comercial)) {
      const txt = safeText(value);
      if (txt) bullets.push(`${key}: ${txt}`);
    }
  }

  // Cliente
  if (op.cliente) {
    for (const [key, value] of Object.entries(op.cliente)) {
      const txt = safeText(value);
      if (txt) bullets.push(`${key}: ${txt}`);
    }
  }

  // Mitos
  if (op.mitos) {
    for (const [key, value] of Object.entries(op.mitos)) {
      const txt = safeText(value);
      if (txt) bullets.push(`${key}: ${txt}`);
    }
  }

  // Fallback: si no hay bullets pero hay data, poner mensaje genérico
  if (bullets.length === 0 && (op.ficha || op.comercial || op.cliente || op.mitos)) {
    bullets.push("Hay información disponible, pero no se pudo renderizar en bullets.");
  }

  return bullets;
}
