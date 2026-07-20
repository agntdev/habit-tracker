import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("habit:edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habits = await storage.getUserHabits(userId);

  if (habits.length === 0) {
    await ctx.reply("No habits to edit. Create one first!", {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add habit", "add:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (const h of habits) {
    rows.push([inlineButton(`✏️ ${h.name}`, `habit:edit:${h.habitId}`)]);
  }
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply("Which habit do you want to edit?", {
    reply_markup: inlineKeyboard(rows),
  });
});

export default composer;
