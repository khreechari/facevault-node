import { describe, it, expect } from "vitest";
import type { Session, SessionStatus, WebhookEvent } from "../src/models.js";

describe("Model types", () => {
  it("Session interface shape", () => {
    const session: Session = {
      sessionId: "sid-1",
      sessionToken: "tok-1",
      steps: ["selfie", "document"],
      webappUrl: "https://app.facevault.id/?sid=sid-1&st=tok-1",
      challengeNonce: "nonce-abc",
    };

    expect(session.sessionId).toBe("sid-1");
    expect(session.sessionToken).toBe("tok-1");
    expect(session.steps).toHaveLength(2);
    expect(session.webappUrl).toContain("sid=sid-1");
    expect(session.challengeNonce).toBe("nonce-abc");
  });

  it("SessionStatus with defaults", () => {
    const status: SessionStatus = {
      sessionId: "sid-1",
      status: "pending",
      steps: {},
      faceMatchPassed: null,
      error: "",
      createdAt: null,
      completedAt: null,
      trustScore: null,
      trustDecision: null,
      requirePoa: false,
      poa: null,
      antiSpoofing: null,
      credential: null,
    };

    expect(status.faceMatchPassed).toBeNull();
    expect(status.error).toBe("");
    expect(status.createdAt).toBeNull();
    expect(status.trustScore).toBeNull();
    expect(status.trustDecision).toBeNull();
    expect(status.requirePoa).toBe(false);
    expect(status.poa).toBeNull();
    expect(status.antiSpoofing).toBeNull();
    expect(status.credential).toBeNull();
  });

  it("SessionStatus with all fields populated", () => {
    const status: SessionStatus = {
      sessionId: "sid-2",
      status: "completed",
      steps: { selfie: true, document: true },
      faceMatchPassed: true,
      error: "",
      createdAt: "2026-02-22T10:00:00Z",
      completedAt: "2026-02-22T10:05:00Z",
      trustScore: 85,
      trustDecision: "accept",
      requirePoa: true,
      poa: { status: "verified" },
      antiSpoofing: { score: 0.95, passed: true },
      credential: { id: "cred-1", status: "active" },
    };

    expect(status.status).toBe("completed");
    expect(status.steps.selfie).toBe(true);
    expect(status.completedAt).toBe("2026-02-22T10:05:00Z");
    expect(status.trustScore).toBe(85);
    expect(status.trustDecision).toBe("accept");
    expect(status.requirePoa).toBe(true);
    expect(status.poa).toEqual({ status: "verified" });
    expect(status.antiSpoofing).toEqual({ score: 0.95, passed: true });
    expect(status.credential).toEqual({ id: "cred-1", status: "active" });
  });

  it("WebhookEvent optional fields are optional", () => {
    const event: WebhookEvent = {
      event: "session.completed",
      sessionId: "sid-1",
      status: "completed",
    };

    expect(event.externalUserId).toBeUndefined();
    expect(event.faceMatchPassed).toBeUndefined();
    expect(event.faceMatchScore).toBeUndefined();
    expect(event.confirmedData).toBeUndefined();
    expect(event.documentCheck).toBeUndefined();
    expect(event.trustScore).toBeUndefined();
    expect(event.trustDecision).toBeUndefined();
    expect(event.sanctionsHit).toBeUndefined();
    expect(event.poa).toBeUndefined();
  });

  it("WebhookEvent with all optional fields", () => {
    const event: WebhookEvent = {
      event: "session.completed",
      sessionId: "sid-abc",
      status: "completed",
      externalUserId: "user-42",
      faceMatchPassed: true,
      faceMatchScore: 0.95,
      antiSpoofingScore: 0.99,
      antiSpoofingPassed: true,
      confirmedData: { name: "Alice" },
      completedAt: "2026-02-22T10:00:00Z",
      documentCheck: { valid: true },
      trustScore: 85,
      trustDecision: "accept",
      sanctionsHit: false,
      poa: { status: "verified" },
    };

    expect(event.faceMatchScore).toBe(0.95);
    expect(event.antiSpoofingPassed).toBe(true);
    expect(event.confirmedData).toEqual({ name: "Alice" });
    expect(event.trustScore).toBe(85);
    expect(event.trustDecision).toBe("accept");
    expect(event.sanctionsHit).toBe(false);
    expect(event.poa).toEqual({ status: "verified" });
  });
});
