# Changelog

All notable changes to `facevault` (Node.js SDK).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-05-28

### Fixed

- **Webhook signature verification now HMACs the raw request body** instead of
  re-serializing the parsed JSON. The old approach couldn't reproduce the
  server's exact signed bytes for payloads containing non-ASCII characters
  (names, addresses) or whole-number floats, so valid webhooks could be
  rejected with a bad-signature error. Verification is now byte-exact — pass the
  body exactly as received.

### Changed

- README and examples now document the webhook header as
  `X-FaceVault-Signature` (the API has always sent this header; v1.0.0 docs
  incorrectly showed `X-Signature`).

### Docs

- Roadmap note: credentials API methods are planned for the v2 SDK line
  (held alongside FacePass/FaceKey).

## [1.0.0] - 2026-03-11

### Added

- TypeScript-first client (`FaceVaultClient`) with full type definitions and
  interfaces for all API models.
- `createSession()` — creates a verification session and returns the
  webapp URL to forward to the user.
- `getSession()` — retrieves the current status of a session, including
  `trustScore` (0–100) and `trustDecision` (`accept` / `review` / `reject`).
- `verifySignature()` and `parseEvent()` — webhook HMAC-SHA256 signature
  verification with `crypto.timingSafeEqual` to prevent timing attacks.
- ESM + CJS dual-format package via `tsup`, works everywhere Node 18+ is
  supported.
- Zero runtime dependencies — uses native `fetch` (Node 18+) and
  `node:crypto` only.
