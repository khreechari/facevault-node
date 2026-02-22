export { FaceVaultClient } from "./client.js";
export type { FaceVaultClientOptions } from "./client.js";
export {
  FaceVaultError,
  AuthError,
  NotFoundError,
  RateLimitError,
} from "./errors.js";
export type { Session, SessionStatus, WebhookEvent } from "./models.js";
export { verifySignature, parseEvent } from "./webhook.js";
