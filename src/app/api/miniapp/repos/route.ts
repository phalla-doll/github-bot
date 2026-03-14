import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import * as encryption from "../../../../../services/encryption";
import { listRepos } from "../../../../../services/github";
import { verifyTelegramWebAppInitData } from "../../../../../services/telegram";
import { NextResponse } from "next/server";

function getEnv() {
    const CONVEX_URL = process.env.CONVEX_URL;
    const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!CONVEX_URL || !ENCRYPTION_SECRET || !TELEGRAM_BOT_TOKEN) return null;
    return { convex: new ConvexHttpClient(CONVEX_URL), secret: ENCRYPTION_SECRET, botToken: TELEGRAM_BOT_TOKEN };
}

export async function GET(req: Request) {
    const env = getEnv();
    if (!env) return NextResponse.json({ error: "Server config error" }, { status: 500 });
    const initData = req.headers.get("x-telegram-init-data") ?? "";
    const verified = verifyTelegramWebAppInitData(initData, env.botToken);
    if (!verified) {
        return NextResponse.json({ error: "Invalid init data" }, { status: 401 });
    }
    const encrypted = await env.convex.query(api.users.getUserToken, {
        telegramId: String(verified.user.id),
    });
    if (!encrypted) {
        return NextResponse.json({ error: "Not connected. Connect GitHub first." }, { status: 400 });
    }
    let token: string;
    try {
        token = encryption.decrypt(encrypted, env.secret);
    } catch {
        return NextResponse.json({ error: "Invalid stored token. Reconnect." }, { status: 400 });
    }
    try {
        const repos = await listRepos(token);
        return NextResponse.json({ repos: repos.map((r) => r.fullName) });
    } catch (e) {
        console.error("repos error", e);
        return NextResponse.json({ error: "Failed to list repos" }, { status: 500 });
    }
}
