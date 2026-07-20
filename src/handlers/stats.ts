import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";
import { todayKey, now } from "../clock.js";

const composer = new Composer<Ctx>();

composer.command("stats", async (ctx) => {
  await showStats(ctx);
});

composer.callbackQuery("stats:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showStats(ctx);
});

async function showStats(ctx: Ctx) {
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habits = await storage.getUserHabits(userId);

  if (habits.length === 0) {
    await ctx.reply("No habits yet — tap ➕ Add habit to get started.", {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add habit", "add:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const lines: string[] = ["📊 Your stats:\n"];

  for (const h of habits) {
    const streak = await storage.getStreak(userId, h.habitId);
    const currentStreak = streak?.currentStreak ?? 0;
    const longestStreak = streak?.longestStreak ?? 0;

    const daysSinceCreation = Math.max(
      1,
      Math.floor((Date.now() - h.createdAt) / 86400000) + 1,
    );

    let doneCount = 0;
    for (let i = 0; i < Math.min(daysSinceCreation, 30); i++) {
      const d = new Date(now().getTime() - i * 86400000);
      const dateKey = d.toISOString().slice(0, 10);
      const ci = await storage.getCheckin(userId, h.habitId, dateKey);
      if (ci?.status === "done") doneCount++;
    }

    const rate = Math.round((doneCount / Math.min(daysSinceCreation, 30)) * 100);

    lines.push(
      `• ${h.name}\n` +
        `  Streak: 🔥 ${currentStreak} (best: ${longestStreak})\n` +
        `  Last 30 days: ${rate}%`,
    );
  }

  await ctx.reply(lines.join("\n\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
}

export default composer;
