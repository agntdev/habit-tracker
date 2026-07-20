import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";
import { todayKey } from "../clock.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("habit:checkin", async (ctx) => {
  await ctx.answerCallbackQuery();
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habits = await storage.getUserHabits(userId);
  const active = habits.filter((h) => h.active);

  if (active.length === 0) {
    await ctx.reply("No active habits to check in. Create one first!", {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add habit", "add:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const today = todayKey();
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const h of active) {
    const ci = await storage.getCheckin(userId, h.habitId, today);
    const done = ci?.status === "done" ? " ✓" : "";
    rows.push([
      inlineButton(`${h.name}${done}`, `habit:checkin:${h.habitId}`),
    ]);
  }
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply("Tap a habit to check in:", {
    reply_markup: inlineKeyboard(rows),
  });
});

export default composer;
