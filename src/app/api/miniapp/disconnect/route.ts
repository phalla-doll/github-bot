import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { verifyTelegramWebAppInitData } from "../../../../../services/telegram";
import { NextResponse } from "next/server";

function getEnv() {
    const CONVEX_URL = process.env.CONVEX_URL;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!CONVEX_URL || !TELEGRAM_BOT_TOKEN) return null;
    return { convex: new ConvexHttpClient(CONVEX_URL), botToken: TELEGRAM_BOT_TOKEN };
}

export async function POST(req: Request) {
    const env = getEnv();
    if (!env) return NextResponse.json({ error: "Server config error" }, { status: 500 });
    const initData = req.headers.get("x-telegram-init-data") ?? "";
    const verified = verifyTelegramWebAppInitData(initData, env.botToken);
    if (!verified) {
        return NextResponse.json({ error: "Invalid init data" }, { status: 401 });
    }
    await env.convex.mutation(api.users.disconnectUser, {
        telegramId: String(verified.user.id),
    });
    return NextResponse.json({ ok: true });
}
