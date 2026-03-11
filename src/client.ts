import {
  AuthError,
  FaceVaultError,
  NotFoundError,
  RateLimitError,
} from "./errors.js";
import type { Session, SessionStatus } from "./models.js";

const DEFAULT_BASE_URL = "https://api.facevault.id";
const DEFAULT_WEBAPP_BASE = "https://app.facevault.id";
const DEFAULT_TIMEOUT = 15_000;

export interface FaceVaultClientOptions {
  apiKey: string;
  baseUrl?: string;
  webappBase?: string;
  /** Request timeout in milliseconds. Defaults to 15000. */
  timeout?: number;
}

function validateUrl(url: string, label: string): string {
  url = url.replace(/\/+$/, "");
  if (!url.startsWith("https://")) {
    throw new TypeError(
      `${label} must use HTTPS (got ${JSON.stringify(url)}). ` +
        "This prevents API keys and session tokens from leaking over plaintext.",
    );
  }
  return url;
}

function validateApiKey(apiKey: string): void {
  if (!apiKey || !apiKey.trim()) {
    throw new TypeError("apiKey must be a non-empty string");
  }
}

/**
 * Client for the FaceVault verification API.
 *
 * @example
 * ```ts
 * const client = new FaceVaultClient({ apiKey: "fv_live_your_api_key" });
 * const session = await client.createSession("user-123");
 * console.log(session.webappUrl);
 * ```
 */
export class FaceVaultClient {
  private readonly _apiKey: string;
  private readonly _baseUrl: string;
  private readonly _webappBase: string;
  private readonly _timeout: number;

  constructor(options: FaceVaultClientOptions) {
    validateApiKey(options.apiKey);
    this._apiKey = options.apiKey;
    this._baseUrl = validateUrl(
      options.baseUrl ?? DEFAULT_BASE_URL,
      "baseUrl",
    );
    this._webappBase = validateUrl(
      options.webappBase ?? DEFAULT_WEBAPP_BASE,
      "webappBase",
    );
    this._timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  private async _raiseForStatus(response: Response): Promise<void> {
    if (response.ok) return;

    let detail = "";
    try {
      const data = await response.json();
      detail = data.detail || data.error || "";
    } catch {
      // response body not JSON
    }

    const msg = detail || `API error (${response.status})`;

    switch (response.status) {
      case 401:
        throw new AuthError(msg);
      case 404:
        throw new NotFoundError(msg);
      case 429:
        throw new RateLimitError(msg);
      default:
        throw new FaceVaultError(msg, response.status);
    }
  }

  /**
   * Create a new verification session.
   *
   * @param externalUserId - Your user identifier (e.g. Telegram chat ID).
   * @param options - Optional settings (e.g. requirePoa).
   * @returns Session with sessionId, sessionToken, and webappUrl.
   */
  async createSession(externalUserId: string, options?: { requirePoa?: boolean }): Promise<Session> {
    let url = `${this._baseUrl}/api/v1/sessions?external_user_id=${encodeURIComponent(externalUserId)}`;
    if (options?.requirePoa !== undefined) {
      url += `&require_poa=${options.requirePoa}`;
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { "X-FaceVault-Api-Key": this._apiKey },
      signal: AbortSignal.timeout(this._timeout),
    });

    await this._raiseForStatus(response);
    const data = await response.json();

    const sessionId: string = data.session_id;
    const sessionToken: string = data.session_token ?? "";

    return {
      sessionId,
      sessionToken,
      steps: data.steps ?? [],
      webappUrl: `${this._webappBase}/?sid=${sessionId}&st=${sessionToken}`,
      challengeNonce: data.challenge_nonce ?? null,
    };
  }

  /**
   * Get the status of a verification session.
   *
   * @param sessionId - The session ID returned by createSession().
   * @returns SessionStatus with current state and results.
   */
  async getSession(sessionId: string): Promise<SessionStatus> {
    const url = `${this._baseUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "X-FaceVault-Api-Key": this._apiKey },
      signal: AbortSignal.timeout(this._timeout),
    });

    await this._raiseForStatus(response);
    const data = await response.json();

    return {
      sessionId: data.session_id,
      status: data.status,
      steps: data.steps ?? {},
      faceMatchPassed: data.face_match_passed ?? null,
      error: data.error ?? "",
      createdAt: data.created_at ?? null,
      completedAt: data.completed_at ?? null,
      trustScore: data.trust_score ?? null,
      trustDecision: data.trust_decision ?? null,
      requirePoa: data.require_poa ?? false,
      poa: data.poa ?? null,
      antiSpoofing: data.anti_spoofing ?? null,
      credential: data.credential ?? null,
    };
  }

  /** Close the client. No-op with native fetch, provided for API symmetry. */
  close(): void {
    // native fetch has no persistent connection to close
  }

  /** Custom inspect output that redacts the API key. */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `FaceVaultClient { baseUrl: ${JSON.stringify(this._baseUrl)}, apiKey: "***" }`;
  }
}
