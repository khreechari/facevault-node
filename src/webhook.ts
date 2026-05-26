import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookEvent } from "./models.js";

/**
 * Recursively sort object keys to match Python's json.dumps(sort_keys=True).
 * Produces compact JSON with no whitespace (like separators=(",",":")).
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) =>
      JSON.stringify(k) +
      ":" +
      canonicalize((value as Record<string, unknown>)[k]),
  );
  return "{" + pairs.join(",") + "}";
}

/**
 * Verify HMAC-SHA256 signature of a webhook payload.
 *
 * The server computes:
 *   hmac(secret, json.dumps(payload, separators=(",",":"), sort_keys=True), sha256).hexdigest()
 *
 * @param body - Raw request body (string or Buffer).
 * @param signature - Value of the X-FaceVault-Signature header.
 * @param secret - Your webhook secret (from API dashboard).
 * @returns true if the signature is valid.
 */
export function verifySignature(
  body: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  const bodyStr = Buffer.isBuffer(body) ? body.toString("utf-8") : body;

  // Re-serialize to match the server's canonical form (sorted keys, no spaces)
  let canonical: string;
  try {
    const parsed = JSON.parse(bodyStr);
    canonical = canonicalize(parsed);
  } catch {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(canonical)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf-8"),
      Buffer.from(signature, "utf-8"),
    );
  } catch {
    // lengths differ
    return false;
  }
}

/**
 * Parse a webhook payload into a WebhookEvent.
 *
 * @param body - Raw request body (string or Buffer).
 * @returns Parsed WebhookEvent object.
 * @throws {SyntaxError} If the body is not valid JSON.
 */
export function parseEvent(body: string | Buffer): WebhookEvent {
  const bodyStr = Buffer.isBuffer(body) ? body.toString("utf-8") : body;
  const data = JSON.parse(bodyStr);

  return {
    event: data.event ?? "",
    sessionId: data.session_id ?? "",
    status: data.status ?? "",
    externalUserId: data.external_user_id,
    faceMatchPassed: data.face_match_passed,
    faceMatchScore: data.face_match_score,
    antiSpoofingScore: data.anti_spoofing_score,
    antiSpoofingPassed: data.anti_spoofing_passed,
    confirmedData: data.confirmed_data,
    completedAt: data.completed_at,
    documentCheck: data.document_check,
    trustScore: data.trust_score,
    trustDecision: data.trust_decision,
    sanctionsHit: data.sanctions_hit,
    poa: data.poa,
  };
}
