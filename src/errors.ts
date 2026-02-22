/** Base exception for FaceVault API errors. */
export class FaceVaultError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "FaceVaultError";
    this.statusCode = statusCode;
  }
}

/** Raised when authentication fails (401). */
export class AuthError extends FaceVaultError {
  constructor(message = "Invalid or missing API key") {
    super(message, 401);
    this.name = "AuthError";
  }
}

/** Raised when a resource is not found (404). */
export class NotFoundError extends FaceVaultError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/** Raised when rate limit is exceeded (429). */
export class RateLimitError extends FaceVaultError {
  constructor(message = "Rate limit exceeded") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}
