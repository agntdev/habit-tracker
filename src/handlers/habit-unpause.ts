import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("habit:unpause", async (ctx) => {
  await ctx.answerCallbackQuery();
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habits = await storage.getUserHabits(userId);
  const paused = habits.filter((h) => !h.active);

  if (paused.length === 0) {
    await ctx.reply("No paused habits to resume.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (const h of paused) {
    rows.push([inlineButton(`▶️ ${h.name}`, `habit:unpause:${h.habitId}`)]);
  }
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply("Which habit do you want to resume?", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^habit:unpause:(.+)$/, async (ctx) => {
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

  habit.active = true;
  habit.updatedAt = Date.now();
  await storage.saveHabit(habit);

  await ctx.reply(`▶️ "${habit.name}" unpaused! Keep building that streak.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
