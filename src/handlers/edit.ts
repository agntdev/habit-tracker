import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";

const composer = new Composer<Ctx>();

composer.command("edit", async (ctx) => {
  await showEditList(ctx);
});

composer.callbackQuery(/^habit:edit:(.+)$/, async (ctx) => {
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

  ctx.session.flow = {
    type: "edit",
    step: "field",
    data: { habitId },
  };

  const freqLabel =
    habit.frequency === "daily"
      ? "Daily"
      : habit.frequency === "weekdays"
        ? "Weekdays"
        : `${habit.timesPerWeek}x/week`;

  const [h, m] = habit.scheduledTime.split(":").map(Number);
  const period = (h ?? 0) >= 12 ? "PM" : "AM";
  const hour12 = (h ?? 0) % 12 || 12;
  const timeStr = `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`;

  await ctx.reply(
    `Editing "${habit.name}"\nCurrent: ${freqLabel} at ${timeStr}\n\nWhat would you like to change?`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("✏️ Name", `edit:field:name:${habitId}`)],
        [inlineButton("📅 Frequency", `edit:field:freq:${habitId}`)],
        [inlineButton("⏰ Time", `edit:field:time:${habitId}`)],
        [inlineButton("⬅️ Back", `habit:view:${habitId}`)],
      ]),
    },
  );
});

composer.callbackQuery(/^edit:field:name:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match[1];
  ctx.session.flow = { type: "edit", step: "name", data: { habitId } };
  await ctx.editMessageText("What should the new name be?", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back", `habit:edit:${habitId}`)],
    ]),
  });
});

composer.callbackQuery(/^edit:field:freq:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match[1];
  ctx.session.flow = { type: "edit", step: "frequency", data: { habitId } };
  await ctx.editMessageText("Pick a new frequency:", {
    reply_markup: inlineKeyboard([
      [inlineButton("Daily", `edit:freq:daily:${habitId}`)],
      [inlineButton("Specific weekdays", `edit:freq:weekdays:${habitId}`)],
      [inlineButton("Times per week", `edit:freq:times:${habitId}`)],
      [inlineButton("⬅️ Back", `habit:edit:${habitId}`)],
    ]),
  });
});

composer.callbackQuery(/^edit:field:time:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const habitId = ctx.match[1];
  ctx.session.flow = { type: "edit", step: "time", data: { habitId } };
  await ctx.editMessageText("What time? (HH:MM, e.g. 09:00)", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back", `habit:edit:${habitId}`)],
    ]),
  });
});

composer.callbackQuery(/^edit:freq:(.+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const freq = ctx.match[1];
  const habitId = ctx.match[2];
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habit = await storage.getHabit(habitId);

  if (!habit || habit.userId !== userId) {
    await ctx.reply("Habit not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  habit.frequency = freq as Habit["frequency"];
  if (freq === "weekdays") habit.weekdays = [1, 2, 3, 4, 5];
  if (freq === "times-per-week") habit.timesPerWeek = 3;
  habit.updatedAt = Date.now();
  await storage.saveHabit(habit);
  ctx.session.flow = undefined;

  await ctx.editMessageText(`✅ "${habit.name}" frequency updated!`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.on("message:text", async (ctx, next) => {
  const flow = ctx.session.flow;
  if (!flow || flow.type !== "edit") return next();

  const text = ctx.message.text.trim();
  const habitId = flow.data.habitId as string;
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habit = await storage.getHabit(habitId);

  if (!habit || habit.userId !== userId) {
    ctx.session.flow = undefined;
    await ctx.reply("Habit not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  if (flow.step === "name") {
    if (text.length < 1 || text.length > 100) {
      await ctx.reply("Name must be 1–100 characters. Try again:");
      return;
    }
    habit.name = text;
    habit.updatedAt = Date.now();
    await storage.saveHabit(habit);
    ctx.session.flow = undefined;
    await ctx.reply(`✅ Habit renamed to "${text}"!`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  if (flow.step === "time") {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(text)) {
      await ctx.reply("Please use HH:MM format (e.g. 09:00). Try again:");
      return;
    }
    habit.scheduledTime = text;
    habit.updatedAt = Date.now();
    await storage.saveHabit(habit);
    ctx.session.flow = undefined;
    await ctx.reply(`✅ "${habit.name}" time updated to ${text}!`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  return next();
});

import type { Habit } from "../types.js";

async function showEditList(ctx: Ctx) {
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
}

export default composer;
