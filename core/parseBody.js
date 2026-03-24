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

  if (!message || typeof message !== "string" || !message.trim()) {
    return { ok: false, status: 400, error: "validation_error" };
  }

  return { ok: true, message: message.trim() };
}
