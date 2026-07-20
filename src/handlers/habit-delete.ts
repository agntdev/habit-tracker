import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, confirmKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("habit:delete", async (ctx) => {
  await ctx.answerCallbackQuery();
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habits = await storage.getUserHabits(userId);

  if (habits.length === 0) {
    await ctx.reply("No habits to delete.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (const h of habits) {
    rows.push([inlineButton(`🗑 ${h.name}`, `habit:delete:${h.habitId}`)]);
  }
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply("Which habit do you want to delete?", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^habit:delete:(.+)$/, async (ctx) => {
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

  ctx.session.flow = { type: "delete", step: "confirm", data: { habitId } };

  await ctx.reply(`Delete "${habit.name}"? This can't be undone.`, {
    reply_markup: confirmKeyboard("delete:confirm", { yes: "🗑 Delete", no: "❌ Keep" }),
  });
});

composer.callbackQuery("delete:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const flow = ctx.session.flow;
  if (!flow || flow.type !== "delete") return;

  const habitId = flow.data.habitId as string;
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habit = await storage.getHabit(habitId);

  if (habit && habit.userId === userId) {
    await storage.deleteHabit(habitId);
    await ctx.editMessageText(`🗑 "${habit.name}" deleted.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  } else {
    await ctx.editMessageText("Habit not found.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  }

  ctx.session.flow = undefined;
});

composer.callbackQuery("delete:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.flow = undefined;
  await ctx.editMessageText("Kept! No changes made.", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
