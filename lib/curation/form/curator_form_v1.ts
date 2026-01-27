// PATH: lib/curation/form/curator_form_v1.ts
// LINES: 95

export type RenderedOutput = {
  title: string;
  bullets: string[];
};

export type CuratorFormResult =
  | { ok: true; output: RenderedOutput }
  | { ok: false; blocked_reason: string };

const MIN_BULLETS = 1; // ahora permite al menos 1 bullet
const MAX_BULLETS = 5;
const MAX_TITLE_LEN = 90;
const MAX_BULLET_LEN = 220;

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function normalizeLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function hasQuestion(s: string): boolean {
  return s.includes("¿") || s.includes("?");
}

function hasMultiLine(s: string): boolean {
  return s.includes("\n") || s.includes("\r");
}

export function curatorFormV1(input: unknown): CuratorFormResult {
  const obj = input as Partial<RenderedOutput> | null;

  const titleRaw = obj?.title ?? "";
  const bulletsRaw = Array.isArray(obj?.bullets) ? obj.bullets : [];

  // Normaliza título
  const title = normalizeLine(titleRaw);
  if (!title.length) return { ok: false, blocked_reason: "INVALID_FORM_MISSING_TITLE" };
  if (title.length > MAX_TITLE_LEN) return { ok: false, blocked_reason: "INVALID_FORM_TITLE_TOO_LONG" };
  if (hasMultiLine(title)) return { ok: false, blocked_reason: "INVALID_FORM_TITLE_MULTILINE" };
  // Ahora se permite que title tenga pregunta si es comercial
  // if (hasQuestion(title)) return { ok: false, blocked_reason: "INVALID_FORM_TITLE_HAS_QUESTION" };

  // Normaliza bullets
  const bullets = bulletsRaw
    .filter((b) => isNonEmptyString(b))
    .map((b) => normalizeLine(b));

  if (bullets.length < MIN_BULLETS || bullets.length > MAX_BULLETS) {
    return { ok: false, blocked_reason: "INVALID_FORM_BULLET_COUNT" };
  }

  for (const b of bullets) {
    if (hasMultiLine(b)) return { ok: false, blocked_reason: "INVALID_FORM_BULLET_MULTILINE" };
    // Se permite pregunta en bullet comercial
    // if (hasQuestion(b)) return { ok: false, blocked_reason: "INVALID_FORM_BULLET_HAS_QUESTION" };
    if (b.length > MAX_BULLET_LEN) return { ok: false, blocked_reason: "INVALID_FORM_BULLET_TOO_LONG" };
  }

  return { ok: true, output: { title, bullets } };
}
