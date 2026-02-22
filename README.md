# FaceVault Node.js SDK

[![npm version](https://img.shields.io/npm/v/facevault)](https://www.npmjs.com/package/facevault)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-35%20passed-brightgreen)]()

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

// Check session status
const status = await client.getSession(session.sessionId);
console.log(status.status); // "pending", "completed", "failed"
console.log(status.faceMatchPassed);
```

## Webhook verification

```typescript
import { verifySignature, parseEvent } from "facevault";

const body = request.body; // raw string or Buffer
const signature = request.headers["x-signature"];

if (verifySignature(body, signature, "whsec_your_secret")) {
  const event = parseEvent(body);
  console.log(event.event); // "session.completed"
  console.log(event.sessionId);
  console.log(event.faceMatchPassed);
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
- **Secret redaction** — custom `inspect` output masks the API key, safe for logging
- **Timing-safe comparison** — webhook signature verification uses `crypto.timingSafeEqual`

## Documentation

- [Getting started guide](https://facevault.id/docs)
- [API reference](https://facevault.id/docs)
- [Blog: Announcing the Node.js SDK](https://facevault.id/blog/node-sdk)

## License

[MIT](LICENSE)
