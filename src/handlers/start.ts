import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  mainMenuKeyboard,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "➕ Add habit", data: "add:start", order: 10 });
registerMainMenuItem({ label: "📋 My habits", data: "habits:show", order: 20 });
registerMainMenuItem({ label: "✅ Check in", data: "checkin:start", order: 30 });
registerMainMenuItem({ label: "📊 Stats", data: "stats:show", order: 40 });
registerMainMenuItem({ label: "📅 Recap", data: "recap:show", order: 50 });

const WELCOME = "👋 Welcome! Tap a button below to get started.";

const composer = new Composer<Ctx>();

composer.command("start", async (ctx) => {
  ctx.session.flow = undefined;
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.flow = undefined;
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
