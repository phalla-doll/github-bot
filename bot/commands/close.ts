import type { Context } from "telegraf";
import { api } from "../../convex/_generated/api";
import { closeIssue, GitHubError } from "../../services/github";
import type { BotDeps } from "../deps";

const REPO_REGEX = /^[\w.-]+\/[\w.-]+$/;

export function close(deps: BotDeps) {
    return async (ctx: Context) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;
        const text =
            ctx.message && "text" in ctx.message ? ctx.message.text : undefined;
        const match = text?.match(/^\/close\s+(.+?)\s+(\d+)$/);
        const repoPart = match?.[1]?.trim();
        const issueNumStr = match?.[2];
        if (!repoPart || !REPO_REGEX.test(repoPart) || !issueNumStr) {
            await ctx.reply(
                "Usage: /close owner/repo 123 (e.g. /close phalla/my-repo 5)",
            );
            return;
        }
        const issueNumber = Number.parseInt(issueNumStr, 10);
        if (!Number.isFinite(issueNumber) || issueNumber < 1) {
            await ctx.reply("Invalid issue number.");
            return;
        }
        const [owner, repo] = repoPart.split("/");
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
            await ctx.reply("❌ GitHub token invalid. Reconnect using /connect");
            return;
        }
        try {
            const { html_url } = await closeIssue(
                token,
                owner,
                repo,
                issueNumber,
            );
            await ctx.reply(`✅ Issue #${issueNumber} closed\n${html_url}`);
        } catch (e) {
            if (e instanceof GitHubError) {
                if (e.code === "invalid_token")
                    await ctx.reply(
                        "❌ GitHub token invalid. Reconnect using /connect",
                    );
                else if (e.code === "not_owner")
                    await ctx.reply(
                        "❌ You can only close issues on repos you own.",
                    );
                else if (e.code === "repo_not_found")
                    await ctx.reply("❌ Issue not found.");
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
