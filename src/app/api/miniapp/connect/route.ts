import { api } from "../../../../../convex/_generated/api";
import * as encryption from "../../../../../services/encryption";
import { validateToken } from "../../../../../services/github";
import { verifyTelegramWebAppInitData } from "../../../../../services/telegram";
import { NextResponse } from "next/server";
import { getMiniappEnv } from "../getEnv";

export async function POST(req: Request) {
    const env = getMiniappEnv();
    if (!env || !env.secret) return NextResponse.json({ error: "Server config error" }, { status: 500 });
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
