import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveToken = mutation({
    args: {
        telegramId: v.string(),
        token: v.string(),
    },
    handler: async (ctx, { telegramId, token }) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_telegram", (q) => q.eq("telegramId", telegramId))
            .unique();
        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, {
                githubToken: token,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("users", {
                telegramId,
                githubToken: token,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

export const getUserToken = query({
    args: { telegramId: v.string() },
    handler: async (ctx, { telegramId }) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_telegram", (q) => q.eq("telegramId", telegramId))
            .unique();
        return user?.githubToken ?? null;
    },
});

export const disconnectUser = mutation({
    args: { telegramId: v.string() },
    handler: async (ctx, { telegramId }) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_telegram", (q) => q.eq("telegramId", telegramId))
            .unique();
        if (user) await ctx.db.delete(user._id);
    },
});
