# FaceVault Node.js SDK

[![CI](https://github.com/khreechari/facevault-node/actions/workflows/ci.yml/badge.svg)](https://github.com/khreechari/facevault-node/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/facevault)](https://www.npmjs.com/package/facevault)
[![Node versions](https://img.shields.io/node/v/facevault)](https://www.npmjs.com/package/facevault)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-43%20passed-brightgreen)]()

Node.js/TypeScript client for the [FaceVault](https://facevault.id) identity verification API — privacy-first KYC with liveness detection, face matching, and document verification.

## Features

- **TypeScript-first** — full type definitions, interfaces for all models
- **Zero runtime dependencies** — uses native `fetch` (Node 18+) and `node:crypto`
- **ESM + CJS** — dual-format package, works everywhere
- **Webhook verification** — HMAC-SHA256 signature validation with timing-safe comparison
- **Secure by default** — HTTPS enforced, API keys validated, secrets redacted from inspect

## Installation

```bash
npm install facevault
```

## Quick start

```typescript
import { FaceVaultClient } from "facevault";

const client = new FaceVaultClient({ apiKey: "fv_live_your_api_key" });

// Create a verification session
const session = await client.createSession("user-123");
console.log(session.webappUrl); // Send this URL to your user

// With proof of address required
const session2 = await client.createSession("user-123", { requirePoa: true });

// Check session status
const status = await client.getSession(session.sessionId);
console.log(status.status);        // "in_progress", "passed", "failed", "review"
console.log(status.trustScore);     // 0-100 trust score
console.log(status.trustDecision);  // "accept", "review", "reject"
```

## Webhook verification

```typescript
import { verifySignature, parseEvent } from "facevault";

const body = request.body; // raw string or Buffer
const signature = request.headers["x-facevault-signature"];

if (verifySignature(body, signature, "whsec_your_secret")) {
  const event = parseEvent(body);
  console.log(event.event); // "verification.completed"
  console.log(event.sessionId);
  console.log(event.faceMatchPassed);
  console.log(event.trustScore);     // 0-100
  console.log(event.trustDecision);  // "accept", "review", "reject"
  console.log(event.sanctionsHit);   // true/false
}
```

## Error handling

```typescript
import {
  FaceVaultClient,
  AuthError,
  NotFoundError,
  RateLimitError,
} from "facevault";

const client = new FaceVaultClient({ apiKey: "fv_live_your_api_key" });

try {
  const status = await client.getSession("nonexistent");
} catch (err) {
  if (err instanceof AuthError) {
    console.log("Invalid API key");
  } else if (err instanceof NotFoundError) {
    console.log("Session not found");
  } else if (err instanceof RateLimitError) {
    console.log("Too many requests — back off");
  }
}
```

## Security

The SDK enforces security best practices out of the box:

- **HTTPS only** — `http://` URLs are rejected at init to prevent credentials leaking over plaintext
- **Key validation** — empty or whitespace-only API keys throw `TypeError` immediately
- **Secret redaction** — custom `inspect` and `toJSON()` mask the API key, safe for logging
- **True private fields** — ES2022 `#` private fields make the API key inaccessible at runtime
- **Timing-safe comparison** — webhook signature verification uses `crypto.timingSafeEqual`

## What's new in 1.0.0

- `requirePoa` option on `createSession()` — per-session proof of address override
- `trustScore` and `trustDecision` on `SessionStatus` — unified 0-100 trust score
- `requirePoa`, `poa`, `antiSpoofing`, `credential` on `SessionStatus`
- `trustScore`, `trustDecision`, `sanctionsHit`, `poa` on `WebhookEvent`
- `challengeNonce` on `Session` — capture integrity nonce

## Documentation

- [Getting started guide](https://facevault.id/docs)
- [API reference](https://facevault.id/docs)
- [Blog: Announcing the Node.js SDK](https://facevault.id/blog/node-sdk)

## Contributing

Pull requests welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for repo layout,
local dev commands, and PR rules.

## Security

To report a vulnerability, email **security@facevault.id** — do not open a
public issue. See [SECURITY.md](SECURITY.md) for scope and response times.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of changes.

## License

[MIT](LICENSE) © Kaditham Holdings Pte Ltd
