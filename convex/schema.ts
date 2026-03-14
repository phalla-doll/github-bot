import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        telegramId: v.string(),
        githubToken: v.string(),
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_telegram", ["telegramId"]),
});
