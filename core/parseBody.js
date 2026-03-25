// /core/parseBody.js

export function parseBody(req) {
  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return { ok: false, status: 400, error: "invalid_json_body" };
    }
  }

  const { message } = body || {};

  if (!message || typeof message !== "string") {
    return { ok: false, status: 400, error: "validation_error" };
  }

  const clean = message.trim().replace(/\s+/g, " ");

  if (clean.length === 0) {
    return { ok: false, status: 400, error: "empty_message" };
  }

  const MAX_LENGTH = 2000;

  const safe = clean.slice(0, MAX_LENGTH);

  return { ok: true, message: safe };
}
