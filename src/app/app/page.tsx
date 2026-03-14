"use client";

import { useCallback, useEffect, useState } from "react";

type View = "home" | "connect" | "repos" | "create";

declare global {
    interface Window {
        Telegram?: {
            WebApp?: {
                initData: string;
                ready: () => void;
                expand: () => void;
                close: () => void;
            };
        };
    }
}

function getInitData(): string {
    if (typeof window === "undefined") return "";
    return window.Telegram?.WebApp?.initData ?? "";
}

async function api<T>(
    path: string,
    init?: Omit<RequestInit, "body"> & { body?: object },
): Promise<T> {
    const initData = getInitData();
    const { body, ...rest } = init ?? {};
    const res = await fetch(path, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            "x-telegram-init-data": initData,
            ...rest.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
    return data as T;
}

export default function MiniAppPage() {
    const [view, setView] = useState<View>("home");
    const [initData, setInitData] = useState("");
    const [token, setToken] = useState("");
    const [repos, setRepos] = useState<string[]>([]);
    const [selectedRepo, setSelectedRepo] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const apply = () => {
            const data = getInitData();
            if (data) {
                window.Telegram?.WebApp?.ready();
                window.Telegram?.WebApp?.expand();
            }
            setInitData(data);
        };
        apply();
        const t = setTimeout(apply, 500);
        return () => clearTimeout(t);
    }, []);

    const clearFeedback = useCallback(() => {
        setError("");
        setSuccess("");
    }, []);

    const handleConnect = async () => {
        clearFeedback();
        setLoading(true);
        try {
            await api("/api/miniapp/connect", { method: "POST", body: { token } });
            setSuccess("GitHub connected.");
            setToken("");
            setView("home");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Connect failed");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadRepos = async () => {
        clearFeedback();
        setLoading(true);
        try {
            const data = await api<{ repos: string[] }>("/api/miniapp/repos");
            setRepos(data.repos);
            setView("repos");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load repos");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        clearFeedback();
        setLoading(true);
        try {
            await api("/api/miniapp/disconnect", { method: "POST" });
            setSuccess("Disconnected.");
            setView("home");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Disconnect failed");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateIssue = async () => {
        clearFeedback();
        const [owner, repo] = selectedRepo.split("/");
        if (!owner || !repo || !title.trim()) {
            setError("Select repo and enter title.");
            return;
        }
        setLoading(true);
        try {
            const data = await api<{ url: string }>("/api/miniapp/issues", {
                method: "POST",
                body: { owner, repo, title: title.trim(), body: body.trim() },
            });
            setSuccess(`Issue created: ${data.url}`);
            setTitle("");
            setBody("");
            setSelectedRepo("");
            setView("home");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create issue");
        } finally {
            setLoading(false);
        }
    };

    if (!initData) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: "var(--tg-theme-bg-color,#fff)", color: "var(--tg-theme-text-color,#000)" }}>
                <p className="text-center">
                    Open this app from Telegram to use it.
                </p>
            </div>
        );
    }

    return (
        <div
                className="min-h-screen p-4"
                style={{
                    backgroundColor: "var(--tg-theme-bg-color, #fff)",
                    color: "var(--tg-theme-text-color, #000)",
                }}
            >
                {(error || success) && (
                    <div
                        className="mb-4 rounded-lg p-3 text-sm"
                        style={{
                            backgroundColor: success
                                ? "var(--tg-theme-button-color, #2481cc)"
                                : "var(--tg-theme-hint-color, #999)",
                            color: "var(--tg-theme-button-text-color, #fff)",
                        }}
                    >
                        {success || error}
                    </div>
                )}

                {view === "home" && (
                    <div className="flex flex-col gap-3">
                        <h1 className="text-lg font-semibold">GitHub Issue Bot</h1>
                        <button
                            type="button"
                            className="rounded-lg px-4 py-3 font-medium"
                            style={{
                                backgroundColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-text-color)",
                            }}
                            onClick={() => setView("connect")}
                        >
                            Connect GitHub
                        </button>
                        <button
                            type="button"
                            className="rounded-lg border px-4 py-3 font-medium"
                            style={{
                                borderColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-color)",
                            }}
                            onClick={handleLoadRepos}
                            disabled={loading}
                        >
                            My repositories
                        </button>
                        <button
                            type="button"
                            className="rounded-lg border px-4 py-3 font-medium"
                            style={{
                                borderColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-color)",
                            }}
                            onClick={() => setView("create")}
                            disabled={loading}
                        >
                            New issue
                        </button>
                        <button
                            type="button"
                            className="mt-2 text-sm opacity-70"
                            onClick={handleDisconnect}
                            disabled={loading}
                        >
                            Disconnect GitHub
                        </button>
                    </div>
                )}

                {view === "connect" && (
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            className="self-start text-sm opacity-70"
                            onClick={() => setView("home")}
                        >
                            ← Back
                        </button>
                        <h2 className="text-lg font-semibold">Connect GitHub</h2>
                        <p className="text-sm opacity-80">
                            Paste your GitHub Personal Access Token.
                        </p>
                        <input
                            type="password"
                            placeholder="ghp_..."
                            className="w-full rounded-lg border px-3 py-2"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            style={{
                                borderColor: "var(--tg-theme-hint-color)",
                                backgroundColor: "var(--tg-theme-bg-color)",
                                color: "var(--tg-theme-text-color)",
                            }}
                        />
                        <button
                            type="button"
                            className="rounded-lg px-4 py-3 font-medium disabled:opacity-50"
                            style={{
                                backgroundColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-text-color)",
                            }}
                            onClick={handleConnect}
                            disabled={loading || !token.trim()}
                        >
                            {loading ? "Connecting…" : "Connect"}
                        </button>
                    </div>
                )}

                {view === "repos" && (
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            className="self-start text-sm opacity-70"
                            onClick={() => setView("home")}
                        >
                            ← Back
                        </button>
                        <h2 className="text-lg font-semibold">Repositories</h2>
                        <ul className="max-h-64 list-none overflow-auto rounded-lg border p-0">
                            {repos.map((fullName) => (
                                <li
                                    key={fullName}
                                    className="border-b p-3 last:border-b-0"
                                    style={{
                                        borderColor: "var(--tg-theme-hint-color)",
                                    }}
                                >
                                    {fullName}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {view === "create" && (
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            className="self-start text-sm opacity-70"
                            onClick={() => setView("home")}
                        >
                            ← Back
                        </button>
                        <h2 className="text-lg font-semibold">New issue</h2>
                        <label htmlFor="repo" className="text-sm opacity-80">Repo (owner/name)</label>
                        <input
                            id="repo"
                            type="text"
                            placeholder="owner/repo"
                            className="w-full rounded-lg border px-3 py-2"
                            value={selectedRepo}
                            onChange={(e) => setSelectedRepo(e.target.value)}
                            style={{
                                borderColor: "var(--tg-theme-hint-color)",
                                backgroundColor: "var(--tg-theme-bg-color)",
                                color: "var(--tg-theme-text-color)",
                            }}
                        />
                        <label htmlFor="title" className="text-sm opacity-80">Title</label>
                        <input
                            id="title"
                            type="text"
                            placeholder="Issue title"
                            className="w-full rounded-lg border px-3 py-2"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{
                                borderColor: "var(--tg-theme-hint-color)",
                                backgroundColor: "var(--tg-theme-bg-color)",
                                color: "var(--tg-theme-text-color)",
                            }}
                        />
                        <label htmlFor="body" className="text-sm opacity-80">Description (optional)</label>
                        <textarea
                            id="body"
                            placeholder="Description"
                            rows={4}
                            className="w-full rounded-lg border px-3 py-2"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            style={{
                                borderColor: "var(--tg-theme-hint-color)",
                                backgroundColor: "var(--tg-theme-bg-color)",
                                color: "var(--tg-theme-text-color)",
                            }}
                        />
                        <button
                            type="button"
                            className="rounded-lg px-4 py-3 font-medium disabled:opacity-50"
                            style={{
                                backgroundColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-text-color)",
                            }}
                            onClick={handleCreateIssue}
                            disabled={loading || !selectedRepo.trim() || !title.trim()}
                        >
                            {loading ? "Creating…" : "Create issue"}
                        </button>
                    </div>
                )}
            </div>
    );
}
