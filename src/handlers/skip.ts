import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";
import { todayKey } from "../clock.js";

const composer = new Composer<Ctx>();

composer.command("skip", async (ctx) => {
  await showSkipList(ctx);
});

async function showSkipList(ctx: Ctx) {
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habits = await storage.getUserHabits(userId);
  const active = habits.filter((h) => h.active);

  if (active.length === 0) {
    await ctx.reply("No active habits to skip.", {
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
    const skipped = ci?.status === "skipped" ? " ⏭" : "";
    rows.push([
      inlineButton(`${h.name}${skipped}`, `habit:skip:${h.habitId}`),
    ]);
  }
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply("Tap a habit to skip today:", {
    reply_markup: inlineKeyboard(rows),
  });
}

composer.callbackQuery(/^habit:skip:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match[1];
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habit = await storage.getHabit(habitId);

  if (!habit || habit.userId !== userId) {
    await ctx.reply("Habit not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const today = todayKey();
  const existing = await storage.getCheckin(userId, habitId, today);
  if (existing?.status === "skipped") {
    await ctx.reply(`"${habit.name}" is already skipped today.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  await storage.saveCheckin({
    userId,
    habitId,
    date: today,
    status: "skipped",
    timestamp: Date.now(),
  });

  let streak = await storage.getStreak(userId, habitId);
  if (streak) {
    streak.currentStreak = 0;
    streak.lastUpdated = Date.now();
    await storage.saveStreak(streak);
  }

  await ctx.reply(`⏭ "${habit.name}" skipped for today. Tomorrow's a new day!`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
