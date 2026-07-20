import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";
import { todayKey } from "../clock.js";

const composer = new Composer<Ctx>();

function streakFire(streak: number): string {
  if (streak >= 100) return `🔥🔥🔥 ${streak}`;
  if (streak >= 30) return `🔥🔥 ${streak}`;
  if (streak >= 7) return `🔥 ${streak}`;
  if (streak > 0) return `🔥 ${streak}`;
  return "0";
}

composer.command("habits", async (ctx) => {
  await showHabits(ctx);
});

composer.callbackQuery("habits:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showHabits(ctx);
});

async function showHabits(ctx: Ctx) {
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habits = await storage.getUserHabits(userId);

  if (habits.length === 0) {
    await ctx.reply("No habits yet — tap ➕ Add habit to create one.", {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add habit", "add:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const lines: string[] = ["📋 Your habits:\n"];
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const h of habits) {
    const streak = await storage.getStreak(userId, h.habitId);
    const streakText = streak ? streakFire(streak.currentStreak) : "🔥 0";
    const status = h.active ? "" : " (paused)";
    lines.push(`• ${h.name}${status} — ${streakText}`);
    rows.push([
      inlineButton(
        h.active ? `✅ ${h.name}` : `▶️ ${h.name}`,
        `habit:view:${h.habitId}`,
      ),
    ]);
  }

  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply(lines.join("\n"), {
    reply_markup: inlineKeyboard(rows),
  });
}

composer.callbackQuery(/^habit:view:(.+)$/, async (ctx) => {
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

  const streak = await storage.getStreak(userId, habit.habitId);
  const streakText = streak ? streakFire(streak.currentStreak) : "🔥 0";
  const freqText =
    habit.frequency === "daily"
      ? "Daily"
      : habit.frequency === "weekdays"
        ? "Weekdays"
        : `${habit.timesPerWeek}x/week`;

  const [h, m] = habit.scheduledTime.split(":").map(Number);
  const period = (h ?? 0) >= 12 ? "PM" : "AM";
  const hour12 = (h ?? 0) % 12 || 12;
  const timeStr = `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`;

  const lines = [
    `📋 ${habit.name}`,
    `Frequency: ${freqText}`,
    `Time: ${timeStr}`,
    `Streak: ${streakText}`,
    habit.active ? "Status: Active" : "Status: Paused",
  ];

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  if (habit.active) {
    rows.push([
      inlineButton("✅ Check in", `habit:checkin:${habit.habitId}`),
      inlineButton("⏭ Skip", `habit:skip:${habit.habitId}`),
    ]);
    rows.push([
      inlineButton("✏️ Edit", `habit:edit:${habit.habitId}`),
      inlineButton("⏸ Pause", `habit:pause:${habit.habitId}`),
    ]);
    rows.push([
      inlineButton("🗑 Delete", `habit:delete:${habit.habitId}`),
    ]);
  } else {
    rows.push([
      inlineButton("▶️ Unpause", `habit:unpause:${habit.habitId}`),
      inlineButton("✏️ Edit", `habit:edit:${habit.habitId}`),
    ]);
    rows.push([
      inlineButton("🗑 Delete", `habit:delete:${habit.habitId}`),
    ]);
  }
  rows.push([inlineButton("⬅️ Back to habits", "habits:show")]);

  await ctx.reply(lines.join("\n"), {
    reply_markup: inlineKeyboard(rows),
  });
});

export default composer;
