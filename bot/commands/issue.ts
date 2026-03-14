import type { Context } from "telegraf";
import { api } from "../../convex/_generated/api";
import { createIssue, GitHubError } from "../../services/github";
import type { BotDeps } from "../deps";
import { clearDraft, getDraft, setDraft } from "../state";

const REPO_REGEX = /^[\w.-]+\/[\w.-]+$/;

export function issue(_deps: BotDeps) {
    return async (ctx: Context) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;
        const text =
            ctx.message && "text" in ctx.message ? ctx.message.text : undefined;
        const match = text?.match(/^\/issue\s+(.+)/);
        const repo = match?.[1]?.trim();
        if (!repo || !REPO_REGEX.test(repo)) {
            await ctx.reply(
                "Usage: /issue owner/repo (e.g. /issue phalla/my-repo)",
            );
            return;
        }
        setDraft(telegramId, { repo, step: "repo_selected" });
        await ctx.reply("Issue title?");
    };
}

export async function handleIssueFlow(
    deps: BotDeps,
    telegramId: number,
    text: string,
    reply: (text: string) => Promise<unknown>,
): Promise<boolean> {
    const draft = getDraft(telegramId);
    if (!draft) return false;

    if (draft.step === "repo_selected") {
        draft.title = text;
        draft.step = "title_received";
        await reply("Issue description?");
        return true;
    }

    if (draft.step === "title_received") {
        draft.body = text;
        draft.step = "description_received";
    }

    const [owner, repo] = draft.repo.split("/");
    const encrypted = await deps.convex.query(api.users.getUserToken, {
        telegramId: String(telegramId),
    });
    if (!encrypted) {
        clearDraft(telegramId);
        await reply("Reconnect using /connect");
        return true;
    }
    let token: string;
    try {
        token = deps.decrypt(encrypted, deps.encryptionSecret);
    } catch {
        clearDraft(telegramId);
        await reply("❌ GitHub token invalid. Reconnect using /connect");
        return true;
    }
    try {
        const { htmlUrl } = await createIssue(
            token,
            owner,
            repo,
            draft.title ?? "",
            draft.body ?? "",
        );
        clearDraft(telegramId);
        console.log("issue_created", { telegramId, repo: draft.repo });
        await reply(`✅ Issue created\n${htmlUrl}`);
    } catch (e) {
        if (e instanceof GitHubError) {
            if (e.code === "invalid_token")
                await reply(
                    "❌ GitHub token invalid. Reconnect using /connect",
                );
            else if (e.code === "repo_not_found")
                await reply("❌ Repository not accessible.");
            else if (e.code === "rate_limit")
                await reply(
                    "⚠️ GitHub API rate limit reached. Try again later.",
                );
            else await reply(`❌ ${e.message}`);
        } else {
            console.error("api_error", e);
            await reply("Something went wrong. Try again later.");
        }
        clearDraft(telegramId);
    }
    return true;
}
