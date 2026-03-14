import type { Context } from "telegraf";
import { api } from "../../convex/_generated/api";
import { getIssue, GitHubError, listIssues } from "../../services/github";
import type { BotDeps } from "../deps";

const REPO_REGEX = /^[\w.-]+\/[\w.-]+$/;
const MAX_BODY_LEN = 400;

function replyError(e: unknown, reply: (t: string) => Promise<unknown>) {
    if (e instanceof GitHubError) {
        if (e.code === "invalid_token")
            return reply("❌ GitHub token invalid. Reconnect using /connect");
        if (e.code === "not_owner")
            return reply("❌ You can only view issues on repos you own.");
        if (e.code === "repo_not_found")
            return reply("❌ Repository or issue not found.");
        if (e.code === "rate_limit")
            return reply("⚠️ GitHub API rate limit reached. Try again later.");
        return reply(`❌ ${e.message}`);
    }
    console.error("api_error", e);
    return reply("Something went wrong. Try again later.");
}

export function view(deps: BotDeps) {
    return async (ctx: Context) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;
        const text =
            ctx.message && "text" in ctx.message ? ctx.message.text : undefined;
        const match = text?.match(/^\/view\s+(.+?)(?:\s+(\d+))?$/);
        const repoPart = match?.[1]?.trim();
        const issueNumStr = match?.[2];
        if (!repoPart || !REPO_REGEX.test(repoPart)) {
            await ctx.reply(
                "Usage: /view owner/repo or /view owner/repo 123 (e.g. /view phalla/my-repo 5)",
            );
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
            if (issueNumStr) {
                const issueNumber = Number.parseInt(issueNumStr, 10);
                if (!Number.isFinite(issueNumber) || issueNumber < 1) {
                    await ctx.reply("Invalid issue number.");
                    return;
                }
                const issue = await getIssue(token, owner, repo, issueNumber);
                const body =
                    issue.body && issue.body.length > MAX_BODY_LEN
                        ? `${issue.body.slice(0, MAX_BODY_LEN)}…`
                        : issue.body ?? "(no description)";
                await ctx.reply(
                    `#${issue.number} ${issue.title}\nState: ${issue.state}\n\n${body}\n\n${issue.html_url}`,
                );
            } else {
                const issues = await listIssues(token, owner, repo);
                if (issues.length === 0) {
                    await ctx.reply("No open issues.");
                    return;
                }
                const lines = issues.map(
                    (i) => `#${i.number} ${i.title}\n${i.html_url}`,
                );
                await ctx.reply(lines.join("\n\n"));
            }
        } catch (e) {
            await replyError(e, (msg) => ctx.reply(msg));
        }
    };
}
