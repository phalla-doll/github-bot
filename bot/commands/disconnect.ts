import type { Context } from "telegraf";
import { api } from "../../convex/_generated/api";
import type { BotDeps } from "../deps";
import { clearDraft } from "../state";

export function disconnect(deps: BotDeps) {
    return async (ctx: Context) => {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;
        await deps.convex.mutation(api.users.disconnectUser, {
            telegramId: String(telegramId),
        });
        clearDraft(telegramId);
        console.log("token_removed", { telegramId });
        await ctx.reply("Token removed.");
    };
}
