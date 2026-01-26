// PATH: lib/curation/form/curator_form_v1.ts
// LINES: 94

export type RenderedOutput = {
  title: string;
  bullets: string[];
};

export type CuratorFormResult =
  | { ok: true; output: RenderedOutput }
  | { ok: false; blocked_reason: string };

const MIN_BULLETS = 3;
const MAX_BULLETS = 5;

// Heurísticas duras (V1): evita prosa/preguntas largas por error del renderer.
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

  const titleRaw = obj?.title;
  const bulletsRaw = obj?.bullets;

  if (!isNonEmptyString(titleRaw)) {
    return { ok: false, blocked_reason: "INVALID_FORM_MISSING_TITLE" };
  }
  if (!Array.isArray(bulletsRaw)) {
    return { ok: false, blocked_reason: "INVALID_FORM_MISSING_BULLETS" };
  }

  const title = normalizeLine(titleRaw);
  if (title.length > MAX_TITLE_LEN) {
    return { ok: false, blocked_reason: "INVALID_FORM_TITLE_TOO_LONG" };
  }
  if (hasMultiLine(title)) {
    return { ok: false, blocked_reason: "INVALID_FORM_TITLE_MULTILINE" };
  }
  if (hasQuestion(title)) {
    return { ok: false, blocked_reason: "INVALID_FORM_TITLE_HAS_QUESTION" };
  }

  const bullets = bulletsRaw
    .filter((b) => isNonEmptyString(b))
    .map((b) => normalizeLine(b));

  if (bullets.length < MIN_BULLETS || bullets.length > MAX_BULLETS) {
    return { ok: false, blocked_reason: "INVALID_FORM_BULLET_COUNT" };
  }

  for (const b of bullets) {
    if (hasMultiLine(b)) {
      return { ok: false, blocked_reason: "INVALID_FORM_BULLET_MULTILINE" };
    }
    if (hasQuestion(b)) {
      return { ok: false, blocked_reason: "INVALID_FORM_BULLET_HAS_QUESTION" };
    }
    if (b.length > MAX_BULLET_LEN) {
      return { ok: false, blocked_reason: "INVALID_FORM_BULLET_TOO_LONG" };
    }
  }

  return { ok: true, output: { title, bullets } };
}
