import type { Context } from "telegraf";

export async function start(ctx: Context) {
    await ctx.reply(
        "Welcome to the GitHub Issue Bot. Use /app to open the Mini App, or /connect, /repos, /issue owner/repo in chat. Use /help for all commands.",
    );
}
