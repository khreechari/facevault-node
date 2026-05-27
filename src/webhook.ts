import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookEvent } from "./models.js";

/**
 * Verify the HMAC-SHA256 signature of a webhook.
 *
 * The server signs the exact bytes it sends, so verification HMACs the **raw
 * request body** as received — do not parse and re-serialize it first.
 * Re-serializing can change the bytes (e.g. non-ASCII escaping or number
 * formatting differs across languages) and would reject valid webhooks.
 *
 *   sig = hmac(secret, rawBody, sha256).hexdigest()   // hex; matches X-FaceVault-Signature
 *
 * @param body - Raw request body, exactly as received (string or Buffer).
 * @param signature - Value of the X-FaceVault-Signature header.
 * @param secret - Your webhook secret (from the API dashboard).
 * @returns true if the signature is valid.
 */
export function verifySignature(
  body: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (typeof signature !== "string" || signature.length === 0) return false;

  const expected = createHmac("sha256", secret)
    .update(typeof body === "string" ? Buffer.from(body, "utf-8") : body)
    .digest("hex");

  // Constant-time comparison; bail first if lengths differ (timingSafeEqual throws).
  const expectedBuf = Buffer.from(expected, "utf-8");
  const signatureBuf = Buffer.from(signature, "utf-8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
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
