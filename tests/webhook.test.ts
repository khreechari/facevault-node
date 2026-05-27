import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature, parseEvent } from "../src/webhook.js";

const SECRET = "whsec_test_secret";

/** The server signs the exact bytes it sends, so sign the raw body string. */
function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

const SAMPLE_PAYLOAD = {
  event: "session.completed",
  session_id: "sid-abc",
  status: "completed",
  external_user_id: "user-42",
  face_match_passed: true,
  face_match_score: 0.95,
};

describe("verifySignature", () => {
  it("accepts a valid signature (string body)", () => {
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
  });

  it("accepts a valid signature (Buffer body)", () => {
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    expect(verifySignature(Buffer.from(body), sign(body), SECRET)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    expect(verifySignature(body, "bad_signature_hex", SECRET)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    expect(verifySignature(body, sign(body), "wrong_secret")).toBe(false);
  });

  it("rejects a tampered body (byte-exact)", () => {
    // A single extra byte must invalidate the signature — verification is over
    // the raw bytes, not a re-parsed/re-serialized form.
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    expect(verifySignature(body + " ", sign(body), SECRET)).toBe(false);
  });

  it("rejects an empty signature", () => {
    expect(verifySignature(JSON.stringify(SAMPLE_PAYLOAD), "", SECRET)).toBe(false);
  });

  it("handles nested objects", () => {
    const body = JSON.stringify({
      event: "session.completed",
      confirmed_data: { name: "Alice", country: "SG" },
    });
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
  });

  it("verifies the raw body byte-for-byte (server escapes non-ASCII as \\uXXXX)", () => {
    // The server sends Python json.dumps(..., ensure_ascii=True): non-ASCII is
    // \uXXXX-escaped and floats keep a trailing .0. We must HMAC the raw bytes
    // as received — re-serializing in JS would change them and reject this.
    const body =
      '{"confirmed_data":{"name":"Jos\\u00e9 M\\u00fcller"},"event":"verification.completed","status":"passed","trust_score":1.0}';
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
  });
});

describe("parseEvent", () => {
  it("parses minimal fields", () => {
    const body = JSON.stringify({
      event: "session.completed",
      session_id: "sid-1",
      status: "completed",
    });

    const event = parseEvent(body);
    expect(event.event).toBe("session.completed");
    expect(event.sessionId).toBe("sid-1");
    expect(event.status).toBe("completed");
    expect(event.externalUserId).toBeUndefined();
    expect(event.faceMatchPassed).toBeUndefined();
    expect(event.trustScore).toBeUndefined();
    expect(event.trustDecision).toBeUndefined();
    expect(event.sanctionsHit).toBeUndefined();
    expect(event.poa).toBeUndefined();
  });

  it("parses all fields", () => {
    const body = JSON.stringify({
      event: "session.completed",
      session_id: "sid-abc",
      status: "completed",
      external_user_id: "user-42",
      face_match_passed: true,
      face_match_score: 0.95,
      anti_spoofing_score: 0.99,
      anti_spoofing_passed: true,
      confirmed_data: { name: "Alice" },
      completed_at: "2026-02-22T10:00:00Z",
      document_check: { valid: true, type: "passport" },
      trust_score: 85,
      trust_decision: "accept",
      sanctions_hit: false,
      poa: { status: "verified" },
    });

    const event = parseEvent(body);
    expect(event.event).toBe("session.completed");
    expect(event.sessionId).toBe("sid-abc");
    expect(event.externalUserId).toBe("user-42");
    expect(event.faceMatchPassed).toBe(true);
    expect(event.faceMatchScore).toBe(0.95);
    expect(event.antiSpoofingScore).toBe(0.99);
    expect(event.antiSpoofingPassed).toBe(true);
    expect(event.confirmedData).toEqual({ name: "Alice" });
    expect(event.completedAt).toBe("2026-02-22T10:00:00Z");
    expect(event.documentCheck).toEqual({ valid: true, type: "passport" });
    expect(event.trustScore).toBe(85);
    expect(event.trustDecision).toBe("accept");
    expect(event.sanctionsHit).toBe(false);
    expect(event.poa).toEqual({ status: "verified" });
  });

  it("parses Buffer input", () => {
    const body = Buffer.from(
      JSON.stringify({
        event: "session.failed",
        session_id: "sid-2",
        status: "failed",
      }),
    );

    const event = parseEvent(body);
    expect(event.event).toBe("session.failed");
    expect(event.sessionId).toBe("sid-2");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseEvent("not json {{{")).toThrow();
  });

  it("defaults missing required fields to empty string", () => {
    const event = parseEvent(JSON.stringify({}));
    expect(event.event).toBe("");
    expect(event.sessionId).toBe("");
    expect(event.status).toBe("");
  });
});
