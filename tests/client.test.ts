import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FaceVaultClient } from "../src/client.js";
import { AuthError, NotFoundError, RateLimitError, FaceVaultError } from "../src/errors.js";

const API_KEY = "fv_test_abc123";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(text: string, status: number): Response {
  return new Response(text, { status });
}

describe("FaceVaultClient", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Construction validation ---

  it("rejects empty apiKey", () => {
    expect(() => new FaceVaultClient({ apiKey: "" })).toThrow(TypeError);
  });

  it("rejects whitespace-only apiKey", () => {
    expect(() => new FaceVaultClient({ apiKey: "   " })).toThrow(TypeError);
  });

  it("rejects HTTP baseUrl", () => {
    expect(
      () => new FaceVaultClient({ apiKey: API_KEY, baseUrl: "http://api.example.com" }),
    ).toThrow(TypeError);
  });

  it("rejects HTTP webappBase", () => {
    expect(
      () => new FaceVaultClient({ apiKey: API_KEY, webappBase: "http://app.example.com" }),
    ).toThrow(TypeError);
  });

  it("strips trailing slash from baseUrl", () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        session_id: "sid-1",
        session_token: "tok-1",
        steps: [],
      }),
    );

    const client = new FaceVaultClient({
      apiKey: API_KEY,
      baseUrl: "https://api.example.com/",
    });

    client.createSession("user-1");

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^https:\/\/api\.example\.com\/api\/v1/);
    expect(calledUrl).not.toMatch(/\/\/api\/v1/);
  });

  // --- createSession ---

  it("createSession sends correct request and maps response", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        session_id: "sid-abc",
        session_token: "tok-xyz",
        steps: ["selfie", "document"],
      }),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    const session = await client.createSession("user-42");

    // Verify fetch was called correctly
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain("/api/v1/sessions?external_user_id=user-42");
    expect(opts.method).toBe("POST");
    expect(opts.headers["X-FaceVault-Api-Key"]).toBe(API_KEY);

    // Verify response mapping
    expect(session.sessionId).toBe("sid-abc");
    expect(session.sessionToken).toBe("tok-xyz");
    expect(session.steps).toEqual(["selfie", "document"]);
  });

  it("createSession builds correct webappUrl", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        session_id: "sid-abc",
        session_token: "tok-xyz",
        steps: [],
      }),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    const session = await client.createSession("user-1");

    expect(session.webappUrl).toBe(
      "https://app.facevault.id/?sid=sid-abc&st=tok-xyz",
    );
  });

  it("createSession uses custom webappBase", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        session_id: "sid-1",
        session_token: "tok-1",
        steps: [],
      }),
    );

    const client = new FaceVaultClient({
      apiKey: API_KEY,
      webappBase: "https://custom.example.com",
    });
    const session = await client.createSession("user-1");

    expect(session.webappUrl).toBe(
      "https://custom.example.com/?sid=sid-1&st=tok-1",
    );
  });

  it("createSession uses custom baseUrl", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        session_id: "sid-1",
        session_token: "tok-1",
        steps: [],
      }),
    );

    const client = new FaceVaultClient({
      apiKey: API_KEY,
      baseUrl: "https://api.staging.example.com",
    });
    await client.createSession("user-1");

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("https://api.staging.example.com/api/v1/sessions");
  });

  it("createSession defaults missing session_token to empty string", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        session_id: "sid-1",
        steps: ["selfie"],
      }),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    const session = await client.createSession("user-1");

    expect(session.sessionToken).toBe("");
  });

  // --- getSession ---

  it("getSession maps snake_case response to camelCase", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        session_id: "sid-abc",
        status: "completed",
        steps: { selfie: true, document: true },
        face_match_passed: true,
        error: "",
        created_at: "2026-02-22T10:00:00Z",
        completed_at: "2026-02-22T10:05:00Z",
      }),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    const status = await client.getSession("sid-abc");

    expect(status.sessionId).toBe("sid-abc");
    expect(status.status).toBe("completed");
    expect(status.steps).toEqual({ selfie: true, document: true });
    expect(status.faceMatchPassed).toBe(true);
    expect(status.error).toBe("");
    expect(status.createdAt).toBe("2026-02-22T10:00:00Z");
    expect(status.completedAt).toBe("2026-02-22T10:05:00Z");
  });

  it("getSession defaults missing optional fields", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        session_id: "sid-1",
        status: "pending",
      }),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    const status = await client.getSession("sid-1");

    expect(status.steps).toEqual({});
    expect(status.faceMatchPassed).toBeNull();
    expect(status.error).toBe("");
    expect(status.createdAt).toBeNull();
    expect(status.completedAt).toBeNull();
  });

  // --- Error handling ---

  it("401 throws AuthError", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ detail: "Invalid API key" }, 401),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    await expect(client.getSession("sid-1")).rejects.toThrow(AuthError);
  });

  it("401 includes detail message", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ detail: "Invalid API key" }, 401),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    await expect(client.getSession("sid-1")).rejects.toThrow("Invalid API key");
  });

  it("404 throws NotFoundError", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ detail: "Session not found" }, 404),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    await expect(client.getSession("bad-id")).rejects.toThrow(NotFoundError);
  });

  it("429 throws RateLimitError", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ error: "Too many requests" }, 429),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });
    await expect(client.getSession("sid-1")).rejects.toThrow(RateLimitError);
  });

  it("500 throws FaceVaultError with status code", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ error: "Internal error" }, 500),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });

    try {
      await client.getSession("sid-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FaceVaultError);
      expect((err as FaceVaultError).statusCode).toBe(500);
      expect((err as FaceVaultError).message).toBe("Internal error");
    }
  });

  it("error response without JSON body uses fallback message", async () => {
    fetchSpy.mockResolvedValue(textResponse("Bad Gateway", 502));

    const client = new FaceVaultClient({ apiKey: API_KEY });

    try {
      await client.getSession("sid-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FaceVaultError);
      expect((err as FaceVaultError).message).toBe("API error (502)");
    }
  });

  it("uses detail field from error response", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ detail: "Custom detail message" }, 403),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });

    try {
      await client.createSession("user-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as FaceVaultError).message).toBe("Custom detail message");
    }
  });

  it("prefers detail over error field", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ detail: "Detail wins", error: "Error loses" }, 400),
    );

    const client = new FaceVaultClient({ apiKey: API_KEY });

    try {
      await client.createSession("user-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as FaceVaultError).message).toBe("Detail wins");
    }
  });

  // --- Misc ---

  it("sends X-FaceVault-Api-Key header", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ session_id: "sid-1", session_token: "t", steps: [] }),
    );

    const client = new FaceVaultClient({ apiKey: "fv_live_secret123" });
    await client.createSession("user-1");

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers["X-FaceVault-Api-Key"]).toBe("fv_live_secret123");
  });

  it("close() does not throw", () => {
    const client = new FaceVaultClient({ apiKey: API_KEY });
    expect(() => client.close()).not.toThrow();
  });

  it("custom inspect redacts apiKey", () => {
    const client = new FaceVaultClient({ apiKey: API_KEY });
    const inspectFn = client[Symbol.for("nodejs.util.inspect.custom") as unknown as keyof typeof client] as () => string;
    const result = inspectFn.call(client);
    expect(result).toContain('apiKey: "***"');
    expect(result).not.toContain(API_KEY);
  });
});
