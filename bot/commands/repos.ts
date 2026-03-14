import type { Context } from "telegraf";
import { api } from "../../convex/_generated/api";
import { GitHubError, listRepos } from "../../services/github";
import type { BotDeps } from "../deps";

export function repos(deps: BotDeps) {
    return async (ctx: Context) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;
        const encrypted = await deps.convex.query(api.users.getUserToken, {
            telegramId: String(telegramId),
        });
        if (!encrypted) {
            await ctx.reply("Reconnect using /connect");
            return;
        }
        let token: string;
        try {
            token = deps.decrypt(encrypted, deps.encryptionSecret);
        } catch {
            await ctx.reply(
                "❌ GitHub token invalid. Reconnect using /connect",
            );
            return;
        }
        try {
            const reposList = await listRepos(token);
            if (reposList.length === 0) {
                await ctx.reply("No repositories found.");
                return;
            }
            const lines = reposList.map((r, i) => `${i + 1}. ${r.fullName}`);
            await ctx.reply(`Your repositories:\n\n${lines.join("\n")}`);
        } catch (e) {
            if (e instanceof GitHubError) {
                if (e.code === "invalid_token")
                    await ctx.reply(
                        "❌ GitHub token invalid. Reconnect using /connect",
                    );
                else if (e.code === "rate_limit")
                    await ctx.reply(
                        "⚠️ GitHub API rate limit reached. Try again later.",
                    );
                else await ctx.reply(`❌ ${e.message}`);
            } else {
                console.error("api_error", e);
                await ctx.reply("Something went wrong. Try again later.");
            }
        }
    };
}
