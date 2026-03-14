import type { Context } from "telegraf";
import { Markup } from "telegraf";

const MINI_APP_URL = process.env.MINI_APP_URL;

export async function app(ctx: Context) {
    if (!MINI_APP_URL) {
        await ctx.reply("Mini App is not configured (MINI_APP_URL).");
        return;
    }
    await ctx.reply("Open the app to connect GitHub, list repos, and create issues.", {
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.webApp("Open App", MINI_APP_URL)],
        ]).reply_markup,
    });
}
