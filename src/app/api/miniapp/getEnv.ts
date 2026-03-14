import { ConvexHttpClient } from "convex/browser";

type MiniappEnv = {
    convex: ConvexHttpClient;
    botToken: string;
    secret: string | null;
};

let cached: MiniappEnv | null = null;

export function getMiniappEnv(): MiniappEnv | null {
    if (cached) return cached;
    const CONVEX_URL = process.env.CONVEX_URL;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET ?? null;
    if (!CONVEX_URL || !TELEGRAM_BOT_TOKEN) return null;
    cached = {
        convex: new ConvexHttpClient(CONVEX_URL),
        botToken: TELEGRAM_BOT_TOKEN,
        secret: ENCRYPTION_SECRET,
    };
    return cached;
}
