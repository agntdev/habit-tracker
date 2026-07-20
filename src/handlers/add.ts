import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
  confirmKeyboard,
  registerMainMenuItem,
} from "../toolkit/index.js";
import { getStorage } from "../storage.js";
import { todayKey } from "../clock.js";
import type { Habit } from "../types.js";

const composer = new Composer<Ctx>();

function freqLabel(freq: string, weekdays?: number[], timesPerWeek?: number): string {
  if (freq === "daily") return "Daily";
  if (freq === "weekdays") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = (weekdays ?? []).map((d) => names[d]).join(", ");
    return `Weekdays: ${days || "none"}`;
  }
  if (freq === "times-per-week") return `${timesPerWeek ?? 0} times per week`;
  return freq;
}

function timeDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = (h ?? 0) >= 12 ? "PM" : "AM";
  const hour12 = (h ?? 0) % 12 || 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

composer.command("add", async (ctx) => {
  ctx.session.flow = { type: "add", step: "name", data: {} };
  await ctx.reply("What habit would you like to build?", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("add:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.flow = { type: "add", step: "name", data: {} };
  await ctx.editMessageText("What habit would you like to build?", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.on("message:text", async (ctx, next) => {
  const flow = ctx.session.flow;
  if (!flow || flow.type !== "add") return next();

  const text = ctx.message.text.trim();

  if (flow.step === "name") {
    if (text.length < 1 || text.length > 100) {
      await ctx.reply("Name must be 1–100 characters. Try again:");
      return;
    }
    flow.data.name = text;
    flow.step = "frequency";
    const kb = inlineKeyboard([
      [inlineButton("Daily", "add:freq:daily")],
      [inlineButton("Specific weekdays", "add:freq:weekdays")],
      [inlineButton("Times per week", "add:freq:times")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]);
    await ctx.reply(`Great! How often do you want to do "${text}"?`, {
      reply_markup: kb,
    });
    return;
  }

  if (flow.step === "time") {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(text)) {
      await ctx.reply("Please use HH:MM format (e.g. 09:00). Try again:");
      return;
    }
    flow.data.time = text;
    flow.step = "confirm";
    const name = flow.data.name as string;
    const freq = flow.data.frequency as string;
    const weekdays = flow.data.weekdays as number[] | undefined;
    const timesPerWeek = flow.data.timesPerWeek as number | undefined;
    const kb = confirmKeyboard("add:confirm", { yes: "✅ Create", no: "❌ Cancel" });
    await ctx.reply(
      `Create "${name}"?\nFrequency: ${freqLabel(freq, weekdays, timesPerWeek)}\nTime: ${timeDisplay(text)}`,
      { reply_markup: kb },
    );
    return;
  }

  return next();
});

composer.callbackQuery(/^add:freq:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const flow = ctx.session.flow;
  if (!flow || flow.type !== "add" || flow.step !== "frequency") return;

  const freq = ctx.match[1];
  if (freq === "weekdays") {
    flow.data.frequency = "weekdays";
    flow.data.weekdays = [1, 2, 3, 4, 5];
    flow.step = "time";
    await ctx.editMessageText("When do you want to do this habit? (HH:MM, e.g. 09:00)", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  if (freq === "times") {
    flow.data.frequency = "times-per-week";
    flow.data.timesPerWeek = 3;
    flow.step = "time";
    await ctx.editMessageText("When do you want to do this habit? (HH:MM, e.g. 09:00)", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  flow.data.frequency = "daily";
  flow.step = "time";
  await ctx.editMessageText("When do you want to do this habit? (HH:MM, e.g. 09:00)", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("add:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const flow = ctx.session.flow;
  if (!flow || flow.type !== "add" || flow.step !== "confirm") return;

  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const tz = "UTC";
  const nowMs = Date.now();

  const habit: Habit = {
    habitId: `h_${userId}_${nowMs}`,
    userId,
    name: flow.data.name as string,
    frequency: flow.data.frequency as Habit["frequency"],
    weekdays: flow.data.weekdays as number[] | undefined,
    timesPerWeek: flow.data.timesPerWeek as number | undefined,
    scheduledTime: (flow.data.time as string) ?? "09:00",
    timezone: tz,
    active: true,
    createdAt: nowMs,
    updatedAt: nowMs,
  };

  await storage.saveHabit(habit);
  ctx.session.flow = undefined;

  const backKb = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);
  await ctx.editMessageText(
    `✅ "${habit.name}" created! You'll be reminded at ${timeDisplay(habit.scheduledTime)} each day.`,
    { reply_markup: backKb },
  );
});

composer.callbackQuery("add:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.flow = undefined;
  await ctx.editMessageText("Cancelled. Tap /start to begin again.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
