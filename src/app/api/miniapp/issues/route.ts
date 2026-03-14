import { api } from "../../../../../convex/_generated/api";
import * as encryption from "../../../../../services/encryption";
import {
    createIssue,
    getIssue,
    GitHubError,
    listIssues,
} from "../../../../../services/github";
import { verifyTelegramWebAppInitData } from "../../../../../services/telegram";
import { NextResponse } from "next/server";
import { getMiniappEnv } from "../getEnv";

export async function GET(req: Request) {
    const env = getMiniappEnv();
    if (!env || !env.secret) return NextResponse.json({ error: "Server config error" }, { status: 500 });
    const initData = req.headers.get("x-telegram-init-data") ?? "";
    const verified = verifyTelegramWebAppInitData(initData, env.botToken);
    if (!verified) {
        return NextResponse.json({ error: "Invalid init data" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner")?.trim();
    const repo = searchParams.get("repo")?.trim();
    const numberParam = searchParams.get("number");
    if (!owner || !repo) {
        return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
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
        if (numberParam) {
            const number = Number.parseInt(numberParam, 10);
            if (!Number.isFinite(number) || number < 1) {
                return NextResponse.json({ error: "Invalid issue number" }, { status: 400 });
            }
            const issue = await getIssue(token, owner, repo, number);
            return NextResponse.json(issue);
        }
        const issues = await listIssues(token, owner, repo);
        return NextResponse.json({ issues });
    } catch (e) {
        if (e instanceof GitHubError) {
            if (e.code === "invalid_token")
                return NextResponse.json({ error: "Invalid token. Reconnect." }, { status: 400 });
            if (e.code === "not_owner")
                return NextResponse.json({ error: "You can only view issues on repos you own." }, { status: 403 });
            if (e.code === "repo_not_found")
                return NextResponse.json({ error: "Repository or issue not found." }, { status: 404 });
            if (e.code === "rate_limit")
                return NextResponse.json({ error: "Rate limit. Try again later." }, { status: 429 });
        }
        console.error("get/list issues error", e);
        return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const env = getMiniappEnv();
    if (!env || !env.secret) return NextResponse.json({ error: "Server config error" }, { status: 500 });
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
            if (e.code === "not_owner")
                return NextResponse.json({ error: "You can only create issues on repos you own." }, { status: 403 });
            if (e.code === "repo_not_found")
                return NextResponse.json({ error: "Repository not accessible." }, { status: 404 });
            if (e.code === "rate_limit")
                return NextResponse.json({ error: "Rate limit. Try again later." }, { status: 429 });
        }
        console.error("create issue error", e);
        return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
    }
}
