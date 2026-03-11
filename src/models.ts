/** Returned by createSession(). Contains the session ID and webapp URL. */
export interface Session {
  sessionId: string;
  sessionToken: string;
  steps: string[];
  webappUrl: string;
  challengeNonce: string | null;
}

/** Returned by getSession(). Full session status. */
export interface SessionStatus {
  sessionId: string;
  status: string;
  steps: Record<string, boolean>;
  faceMatchPassed: boolean | null;
  error: string;
  createdAt: string | null;
  completedAt: string | null;
  trustScore: number | null;
  trustDecision: string | null;
  requirePoa: boolean;
  poa: Record<string, unknown> | null;
  antiSpoofing: Record<string, unknown> | null;
  credential: Record<string, unknown> | null;
}

/** Parsed webhook payload. */
export interface WebhookEvent {
  event: string;
  sessionId: string;
  status: string;
  externalUserId?: string;
  faceMatchPassed?: boolean;
  faceMatchScore?: number;
  antiSpoofingScore?: number;
  antiSpoofingPassed?: boolean;
  confirmedData?: Record<string, unknown>;
  completedAt?: string;
  documentCheck?: Record<string, unknown>;
  trustScore?: number;
  trustDecision?: string;
  sanctionsHit?: boolean;
  poa?: Record<string, unknown>;
}
