import { describe, it, expect } from "vitest";
import type { Session, SessionStatus, WebhookEvent } from "../src/models.js";

describe("Model types", () => {
  it("Session interface shape", () => {
    const session: Session = {
      sessionId: "sid-1",
      sessionToken: "tok-1",
      steps: ["selfie", "document"],
      webappUrl: "https://app.facevault.id/?sid=sid-1&st=tok-1",
    };

    expect(session.sessionId).toBe("sid-1");
    expect(session.sessionToken).toBe("tok-1");
    expect(session.steps).toHaveLength(2);
    expect(session.webappUrl).toContain("sid=sid-1");
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
    };

    expect(status.faceMatchPassed).toBeNull();
    expect(status.error).toBe("");
    expect(status.createdAt).toBeNull();
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
    };

    expect(status.status).toBe("completed");
    expect(status.steps.selfie).toBe(true);
    expect(status.completedAt).toBe("2026-02-22T10:05:00Z");
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
    };

    expect(event.faceMatchScore).toBe(0.95);
    expect(event.antiSpoofingPassed).toBe(true);
    expect(event.confirmedData).toEqual({ name: "Alice" });
  });
});
