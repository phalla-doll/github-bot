import { Telegraf } from "telegraf";
import { app } from "./commands/app";
import { connect, handleTokenMessage } from "./commands/connect";
import { disconnect } from "./commands/disconnect";
import { help } from "./commands/help";
import { close } from "./commands/close";
import { handleIssueFlow, issue } from "./commands/issue";
import { repos } from "./commands/repos";
import { start } from "./commands/start";
import { view } from "./commands/view";
import type { BotDeps } from "./deps";

export function createBot(token: string, deps: BotDeps) {
    const bot = new Telegraf(token);

    bot.command("start", start);
    bot.command("help", help);
    bot.command("app", app);
    bot.command("connect", connect(deps));
    bot.command("repos", repos(deps));
    bot.command("issue", issue(deps));
    bot.command("view", view(deps));
    bot.command("close", close(deps));
    bot.command("disconnect", disconnect(deps));

    bot.on("text", async (ctx) => {
        const telegramId = ctx.from?.id;
        const text = "text" in ctx.message ? ctx.message.text : "";
        if (!telegramId || !text) return;

        const handled = await handleTokenMessage(
            deps,
            telegramId,
            text,
            (msg) => ctx.reply(msg),
        );
        if (handled) return;

        await handleIssueFlow(deps, telegramId, text, (msg) => ctx.reply(msg));
    });

    return bot;
}
