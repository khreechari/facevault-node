/**
 * Example: Express webhook handler for FaceVault events.
 *
 * Install dependencies:
 *   npm install facevault express
 *   npm install -D @types/express
 *
 * Set environment variables:
 *   WEBHOOK_SECRET=whsec_...
 */

import express from "express";
import { verifySignature, parseEvent } from "facevault";

const app = express();

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["x-signature"] as string;

    if (!verifySignature(req.body, sig, process.env.WEBHOOK_SECRET!)) {
      res.status(401).send("Invalid signature");
      return;
    }

    const event = parseEvent(req.body);

    console.log(`Event: ${event.event}`);
    console.log(`Session: ${event.sessionId} → ${event.status}`);

    if (event.faceMatchPassed) {
      console.log(`User ${event.externalUserId} verified (score: ${event.faceMatchScore})`);
    }

    res.sendStatus(200);
  },
);

app.listen(3000, () => {
  console.log("Webhook server listening on port 3000");
});
