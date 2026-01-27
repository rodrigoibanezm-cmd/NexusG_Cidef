// PATH: lib/render/render_bullets_v1.ts
// LINES: 100

type Curatable = {
  ficha?: Record<string, any>;
  comercial?: Record<string, any>;
  cliente?: Record<string, any>;
  mitos?: Record<string, any>;
};

export function safeText(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toString();
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return null;
}

// Genera bullets solo de los campos relevantes
function flattenRelevantData(bucketName: string, data: Record<string, any>, bullets: string[], maxBullets: number) {
  const keys = Object.keys(data);
  for (const key of keys) {
    if (bullets.length >= maxBullets) break;
    const value = data[key];

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      bullets.push(`${bucketName}.${key}: ${safeText(value)}`);
    } else if (typeof value === "object" && value !== null) {
      // Para arrays, solo tomar los primeros 2 elementos
      if (Array.isArray(value)) {
        for (let i = 0; i < Math.min(value.length, 2) && bullets.length < maxBullets; i++) {
          const item = value[i];
          if (typeof item === "object" && item !== null) {
            bullets.push(`${bucketName}.${key}[${i}]: ${JSON.stringify(item)}`);
          } else {
            bullets.push(`${bucketName}.${key}[${i}]: ${safeText(item)}`);
          }
        }
      } else {
        // Objeto plano, solo primer nivel
        const subKeys = Object.keys(value).slice(0, 2);
        for (const subKey of subKeys) {
          if (bullets.length >= maxBullets) break;
          bullets.push(`${bucketName}.${subKey}: ${safeText(value[subKey])}`);
        }
      }
    }
  }
}

export function renderBulletsV1(op: Curatable): string[] {
  const bullets: string[] = [];
  const maxBullets = 5; // máximo 5 bullets para Form
  const buckets: (keyof Curatable)[] = ["ficha", "comercial", "cliente", "mitos"];

  for (const bucket of buckets) {
    const data = op[bucket];
    if (!data) continue;
    flattenRelevantData(bucket, data, bullets, maxBullets);
    if (bullets.length >= maxBullets) break;
  }

  // Fallback: si no hay bullets, pero hay data, avisar
  if (bullets.length === 0 && (op.ficha || op.comercial || op.cliente || op.mitos)) {
    bullets.push("Hay información disponible, pero no se pudo renderizar en bullets.");
  }

  return bullets;
}
