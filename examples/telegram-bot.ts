/**
 * Example: Telegram bot with FaceVault identity verification using grammY.
 *
 * Install dependencies:
 *   npm install facevault grammy
 *
 * Set environment variables:
 *   BOT_TOKEN=...
 *   FACEVAULT_API_KEY=fv_live_...
 */

import { FaceVaultClient } from "facevault";
import { Bot, InlineKeyboard } from "grammy";

const fv = new FaceVaultClient({
  apiKey: process.env.FACEVAULT_API_KEY!,
});

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("verify", async (ctx) => {
  const session = await fv.createSession(String(ctx.from!.id));
  const keyboard = new InlineKeyboard().webApp(
    "Verify Identity",
    session.webappUrl,
  );
  await ctx.reply("Tap the button to start verification:", {
    reply_markup: keyboard,
  });
});

bot.command("status", async (ctx) => {
  const sessionId = ctx.match;
  if (!sessionId) {
    await ctx.reply("Usage: /status <session_id>");
    return;
  }
  const status = await fv.getSession(sessionId);
  await ctx.reply(
    `Session ${status.sessionId}: ${status.status}\n` +
      `Face match: ${status.faceMatchPassed ?? "n/a"}`,
  );
});

bot.start();
