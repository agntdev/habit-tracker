import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStorage } from "../storage.js";
import { now } from "../clock.js";

const composer = new Composer<Ctx>();

composer.command("recap", async (ctx) => {
  await showRecap(ctx);
});

composer.callbackQuery("recap:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showRecap(ctx);
});

async function showRecap(ctx: Ctx) {
  const storage = getStorage();
  const userId = ctx.from?.id ?? 0;
  const habits = await storage.getUserHabits(userId);

  if (habits.length === 0) {
    await ctx.reply("No habits yet — tap ➕ Add habit to get started.", {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add habit", "add:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const today = now();
  const lines: string[] = ["📅 Your week:\n"];

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const h of habits) {
    const rows: string[] = [`📋 ${h.name}:`];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateKey = d.toISOString().slice(0, 10);
      const dayName = dayLabels[d.getDay()];
      const ci = await storage.getCheckin(userId, h.habitId, dateKey);

      let icon: string;
      if (ci?.status === "done") {
        icon = "✅";
      } else if (ci?.status === "skipped") {
        icon = "⏭";
      } else {
        const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        icon = isPast ? "❌" : "·";
      }

      rows.push(`  ${dayName} ${dateKey.slice(5)}: ${icon}`);
    }

    const weekDone = await countWeekDone(storage, userId, h.habitId, today);
    rows.push(`  Summary: ${weekDone}/7 days done`);
    lines.push(rows.join("\n"));
  }

  await ctx.reply(lines.join("\n\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
}

async function countWeekDone(
  storage: ReturnType<typeof getStorage>,
  userId: number,
  habitId: string,
  today: Date,
): Promise<number> {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - i * 86400000);
    const dateKey = d.toISOString().slice(0, 10);
    const ci = await storage.getCheckin(userId, habitId, dateKey);
    if (ci?.status === "done") count++;
  }
  return count;
}

export default composer;
