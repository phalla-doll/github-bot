import type { Context } from "telegraf";

export async function help(ctx: Context) {
    await ctx.reply(
        "Commands:\n" +
            "/start - Welcome message\n" +
            "/app - Open Mini App (connect, repos, create issues)\n" +
            "/connect - Connect GitHub with a Personal Access Token\n" +
            "/repos - List your repositories\n" +
            "/issue owner/repo - Create an issue (e.g. /issue phalla/my-repo)\n" +
            "/disconnect - Remove stored GitHub token\n" +
            "/help - Show this help",
    );
}
