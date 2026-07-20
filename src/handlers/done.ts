import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";
import { todayKey } from "../clock.js";

const composer = new Composer<Ctx>();

composer.command("done", async (ctx) => {
  await showCheckinList(ctx);
});

composer.callbackQuery("checkin:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showCheckinList(ctx);
});

async function showCheckinList(ctx: Ctx) {
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
}

composer.callbackQuery(/^habit:checkin:(.+)$/, async (ctx) => {
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

  if (!habit.active) {
    await ctx.reply(`"${habit.name}" is paused. Unpause it first.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const today = todayKey();
  const existing = await storage.getCheckin(userId, habitId, today);
  if (existing?.status === "done") {
    await ctx.reply(`You already checked in "${habit.name}" today. Nice work! 💪`, {
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
    status: "done",
    timestamp: Date.now(),
  });

  let streak = await storage.getStreak(userId, habitId);
  if (!streak) {
    streak = {
      userId,
      habitId,
      currentStreak: 1,
      longestStreak: 1,
      lastUpdated: Date.now(),
    };
  } else {
    streak.currentStreak += 1;
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }
    streak.lastUpdated = Date.now();
  }
  await storage.saveStreak(streak);

  let celebration = "";
  const s = streak.currentStreak;
  if (s === 7) celebration = "\n🎉 7-day streak! Keep it up!";
  else if (s === 14) celebration = "\n🎉🎉 14-day streak! Amazing!";
  else if (s === 30) celebration = "\n🏆 30-day streak! Incredible!";
  else if (s === 100) celebration = "\n🏆🏆 100-day streak! Legendary!";

  const backKb = inlineKeyboard([
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.reply(
    `✅ "${habit.name}" checked in! Streak: 🔥 ${s}${celebration}`,
    { reply_markup: backKb },
  );
});

export default composer;
