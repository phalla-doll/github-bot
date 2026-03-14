import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import * as encryption from "../../../../../services/encryption";
import { createIssue, GitHubError } from "../../../../../services/github";
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
    const body = (await req.json()) as { owner: string; repo: string; title: string; body?: string };
    const { owner, repo, title } = body;
    if (!owner?.trim() || !repo?.trim() || !title?.trim()) {
        return NextResponse.json({ error: "owner, repo, and title required" }, { status: 400 });
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
        const { htmlUrl } = await createIssue(
            token,
            owner.trim(),
            repo.trim(),
            title.trim(),
            body.body ?? "",
        );
        return NextResponse.json({ ok: true, url: htmlUrl });
    } catch (e) {
        if (e instanceof GitHubError) {
            if (e.code === "invalid_token")
                return NextResponse.json({ error: "Invalid token. Reconnect." }, { status: 400 });
            if (e.code === "repo_not_found")
                return NextResponse.json({ error: "Repository not accessible." }, { status: 404 });
            if (e.code === "rate_limit")
                return NextResponse.json({ error: "Rate limit. Try again later." }, { status: 429 });
        }
        console.error("create issue error", e);
        return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
    }
}
