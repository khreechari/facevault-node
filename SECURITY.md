# Security Policy

## Reporting a vulnerability

If you believe you have found a security issue in the FaceVault Node.js SDK
or the FaceVault API it calls, please **do not open a public GitHub issue**.

Instead, email **security@facevault.id** with:

- A description of the issue and its impact.
- Reproduction steps or a proof-of-concept.
- Affected version (run `node -e "console.log(require('./package.json').version)"`
  in your clone, or check the version you have installed).
- Whether you have already disclosed the issue elsewhere.

We will acknowledge receipt within **3 business days** and aim to ship a fix
within **30 days** for high-severity issues. We will credit you in the release
notes unless you ask to remain anonymous.

## Scope

In scope:

- The `facevault` Node SDK code — in particular, the webhook HMAC-SHA256
  signature verification with timing-safe comparison (`verifySignature`),
  API key handling and redaction, and HTTPS enforcement.
- The FaceVault API endpoints the SDK calls (`/api/v1/sessions`,
  `/api/v1/sessions/:id`).

Out of scope:

- The integrator's own backend — how you authenticate users, store API keys,
  or relay webhook events. The SDK never exposes your API key to the client.
- Operator misconfiguration (e.g. hardcoding API keys in client-side code,
  or skipping signature verification on webhooks).
- DoS / volumetric attacks — the API is rate-limited at the edge.
- Theoretical issues without a demonstrated impact path.

## Supply chain

- All GitHub Actions used in CI and the release workflow are SHA-pinned;
  comments record the human-readable version next to each SHA so bumps stay
  reviewable. `dependabot.yml` watches the pins for updates.
- Release assets include an unsigned `SHA256SUMS.txt`. We are evaluating
  sigstore signing for a future release.
- The SDK has zero runtime dependencies; the attack surface is limited to
  Node built-ins (`node:crypto`, `node:https` via native `fetch`).
