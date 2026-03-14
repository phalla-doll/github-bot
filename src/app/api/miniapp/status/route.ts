import { api } from "../../../../../convex/_generated/api";
import { verifyTelegramWebAppInitData } from "../../../../../services/telegram";
import { NextResponse } from "next/server";
import { getMiniappEnv } from "../getEnv";

export async function GET(req: Request) {
    const env = getMiniappEnv();
    if (!env) return NextResponse.json({ error: "Server config error" }, { status: 500 });
    const initData = req.headers.get("x-telegram-init-data") ?? "";
    const verified = verifyTelegramWebAppInitData(initData, env.botToken);
    if (!verified) {
        return NextResponse.json({ error: "Invalid init data" }, { status: 401 });
    }
    const encrypted = await env.convex.query(api.users.getUserToken, {
        telegramId: String(verified.user.id),
    });
    return NextResponse.json({ connected: !!encrypted });
}
