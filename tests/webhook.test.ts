import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySignature, parseEvent } from "../src/webhook.js";

const SECRET = "whsec_test_secret";

/** Compute signature the same way the server does (sorted keys, compact JSON). */
function sign(payload: unknown, secret = SECRET): string {
  const canonical = canonicalize(payload);
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

/** Recursively sort keys and produce compact JSON (matches Python json.dumps(sort_keys=True, separators=(",",":"))) */
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

const SAMPLE_PAYLOAD = {
  event: "session.completed",
  session_id: "sid-abc",
  status: "completed",
  external_user_id: "user-42",
  face_match_passed: true,
  face_match_score: 0.95,
};

describe("verifySignature", () => {
  it("accepts valid signature (string body)", () => {
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    const sig = sign(SAMPLE_PAYLOAD);
    expect(verifySignature(body, sig, SECRET)).toBe(true);
  });

  it("accepts valid signature (Buffer body)", () => {
    const body = Buffer.from(JSON.stringify(SAMPLE_PAYLOAD));
    const sig = sign(SAMPLE_PAYLOAD);
    expect(verifySignature(body, sig, SECRET)).toBe(true);
  });

  it("rejects invalid signature", () => {
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    expect(verifySignature(body, "bad_signature_hex", SECRET)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const body = JSON.stringify(SAMPLE_PAYLOAD);
    const sig = sign(SAMPLE_PAYLOAD);
    expect(verifySignature(body, sig, "wrong_secret")).toBe(false);
  });

  it("returns false for invalid JSON body", () => {
    expect(verifySignature("not json {{{", "sig", SECRET)).toBe(false);
  });

  it("accepts reordered keys (canonical form matches)", () => {
    // Send body with keys in different order than the canonical form
    const reordered = {
      status: "completed",
      event: "session.completed",
      face_match_passed: true,
      session_id: "sid-abc",
      face_match_score: 0.95,
      external_user_id: "user-42",
    };
    const body = JSON.stringify(reordered);
    // Sign with the original (re-serialization in verifySignature should produce same canonical form)
    const sig = sign(SAMPLE_PAYLOAD);
    expect(verifySignature(body, sig, SECRET)).toBe(true);
  });

  it("handles nested objects with sorted keys", () => {
    const payload = {
      event: "session.completed",
      session_id: "sid-1",
      status: "completed",
      confirmed_data: { name: "Alice", country: "SG" },
    };
    const body = JSON.stringify(payload);
    const sig = sign(payload);
    expect(verifySignature(body, sig, SECRET)).toBe(true);
  });

  it("handles empty body string", () => {
    expect(verifySignature("", "sig", SECRET)).toBe(false);
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
