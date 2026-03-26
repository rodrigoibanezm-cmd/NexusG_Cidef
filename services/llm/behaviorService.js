// /services/llm/behaviorService.js

import { kv } from "@vercel/kv";

import {
  defaultBehavior,
  sanitizeBehavior,
  isDefaultBehavior,
  buildBehaviorBlock,
} from "./behavior.js";

// =========================
// CONFIG
// =========================

const MAX_BEHAVIOR_SIZE = 2000;

// =========================
// HELPERS
// =========================

function normalizeTenantId(tenantId) {
  if (!tenantId || typeof tenantId !== "string" || !tenantId.trim()) {
    return "default";
  }
  return tenantId;
}

function isTooLarge(raw) {
  if (raw == null) return false;

  if (typeof raw === "string") {
    return raw.length > MAX_BEHAVIOR_SIZE;
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    try {
      return JSON.stringify(raw).length > MAX_BEHAVIOR_SIZE;
    } catch {
      return true;
    }
  }

  return true;
}

function parseRaw(raw) {
  if (raw == null) return null;

  try {
    if (typeof raw === "string") {
      return JSON.parse(raw);
    }

    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw;
    }

    return null;
  } catch {
    return null;
  }
}

function isValidParsed(parsed) {
  return (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Object.keys(parsed).length > 0
  );
}

// =========================
// MAIN
// =========================

export async function getBehaviorBlock(inputTenantId) {
  const tenantId = normalizeTenantId(inputTenantId);

  const tenantKey = `cidef:tenant:${tenantId}:behavior`;
  const defaultKey = `cidef:tenant:default:behavior`;

  let raw = null;

  let attempt = "none";
  let origin = "default_code";
  let fallback = "none";

  // =========================
  // 1. TRY TENANT
  // =========================

  attempt = "tenant";

  try {
    raw = await kv.get(tenantKey);
  } catch {
    raw = null;
  }

  // =========================
  // 2. FALLBACK TO DEFAULT REDIS
  // =========================

  if (raw == null) {
    attempt = "default_redis";

    try {
      raw = await kv.get(defaultKey);
    } catch {
      raw = null;
    }
  }

  // =========================
  // 3. SIZE GUARD
  // =========================

  if (isTooLarge(raw)) {
    raw = null;
    fallback = "invalid_size";
  }

  // =========================
  // 4. PARSE
  // =========================

  let parsed = parseRaw(raw);

  if (!isValidParsed(parsed)) {
    if (raw != null && fallback === "none") {
      fallback = "invalid_parse";
    }
    parsed = null;
  }

  // =========================
  // 5. DETERMINE ORIGIN
  // =========================

  if (parsed) {
    origin = attempt;
  } else {
    origin = "default_code";

    if (fallback === "none") {
      fallback = "missing_all";
    }
  }

  // =========================
  // 6. SANITIZE
  // =========================

  const behavior = sanitizeBehavior(parsed || defaultBehavior);

  const isDefault = isDefaultBehavior(behavior);

  // =========================
  // 7. LOGGING
  // =========================

  if (process.env.NODE_ENV !== "production") {
    console.log("BEHAVIOR_RESOLVED:", {
      tenant: tenantId,
      attempt,
      origin,
      fallback,
      is_default: isDefault,
      decision_style: behavior.decision_style,
    });
  }

  // =========================
  // 8. OUTPUT
  // =========================

  if (isDefault) {
    return "";
  }

  return buildBehaviorBlock(behavior);
}
