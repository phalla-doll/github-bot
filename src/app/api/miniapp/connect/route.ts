import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import * as encryption from "../../../../../services/encryption";
import { validateToken } from "../../../../../services/github";
import { verifyTelegramWebAppInitData } from "../../../../../services/telegram";
import { NextResponse } from "next/server";

function getEnv() {
    const CONVEX_URL = process.env.CONVEX_URL;
    const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!CONVEX_URL || !ENCRYPTION_SECRET || !TELEGRAM_BOT_TOKEN) return null;
    return { convex: new ConvexHttpClient(CONVEX_URL), secret: ENCRYPTION_SECRET, botToken: TELEGRAM_BOT_TOKEN };
}

export async function POST(req: Request) {
    const env = getEnv();
    if (!env) return NextResponse.json({ error: "Server config error" }, { status: 500 });
    const initData = req.headers.get("x-telegram-init-data") ?? "";
    const verified = verifyTelegramWebAppInitData(initData, env.botToken);
    if (!verified) {
        return NextResponse.json({ error: "Invalid init data" }, { status: 401 });
    }
    const body = (await req.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    try {
        const valid = await validateToken(token);
        if (!valid) {
            return NextResponse.json({ error: "Invalid GitHub token" }, { status: 400 });
        }
        const encrypted = encryption.encrypt(token, env.secret);
        await env.convex.mutation(api.users.saveToken, {
            telegramId: String(verified.user.id),
            token: encrypted,
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("connect error", e);
        return NextResponse.json({ error: "Invalid GitHub token" }, { status: 400 });
    }
}
