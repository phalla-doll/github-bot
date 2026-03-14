import type { Context } from "telegraf";
import { api } from "../../convex/_generated/api";
import { validateToken } from "../../services/github";
import type { BotDeps } from "../deps";
import { connectAwaitingToken } from "../state";

export function connect(_deps: BotDeps) {
    return async (ctx: Context) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;
        connectAwaitingToken.add(telegramId);
        await ctx.reply("Paste your GitHub Personal Access Token.");
    };
}

export async function handleTokenMessage(
    deps: BotDeps,
    telegramId: number,
    token: string,
    reply: (text: string) => Promise<unknown>,
): Promise<boolean> {
    if (!connectAwaitingToken.has(telegramId)) return false;
    connectAwaitingToken.delete(telegramId);
    const trimmed = token.trim();
    if (!trimmed) {
        await reply("No token received. Use /connect to try again.");
        return true;
    }
    try {
        const valid = await validateToken(trimmed);
        if (!valid) {
            await reply("❌ GitHub token invalid. Reconnect using /connect");
            return true;
        }
        const encrypted = deps.encrypt(trimmed, deps.encryptionSecret);
        await deps.convex.mutation(api.users.saveToken, {
            telegramId: String(telegramId),
            token: encrypted,
        });
        console.log("user_connected", { telegramId });
        await reply("✅ GitHub connected successfully");
    } catch (e) {
        console.error("api_error", e);
        await reply("❌ GitHub token invalid. Reconnect using /connect");
    }
    return true;
}
