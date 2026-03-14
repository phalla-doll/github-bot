"use client";

import { useCallback, useEffect, useState } from "react";

type View = "home" | "connect" | "repos" | "create" | "issues" | "issueDetail";

type IssueSummary = {
    number: number;
    title: string;
    state: string;
    html_url: string;
    body?: string | null;
};

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
    const [connected, setConnected] = useState<boolean | null>(null);
    const [token, setToken] = useState("");
    const [repos, setRepos] = useState<string[]>([]);
    const [selectedRepo, setSelectedRepo] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedRepoForIssues, setSelectedRepoForIssues] = useState("");
    const [issuesList, setIssuesList] = useState<IssueSummary[]>([]);
    const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null);
    const [issueDetail, setIssueDetail] = useState<IssueSummary | null>(null);

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

    useEffect(() => {
        if (!initData) return;
        api<{ connected: boolean }>("/api/miniapp/status")
            .then((data) => setConnected(data.connected))
            .catch(() => setConnected(false));
    }, [initData]);

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
            setConnected(true);
            setToken("");
            setView("home");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Connect failed");
        } finally {
            setLoading(false);
        }
    };

    const fetchRepos = useCallback(async () => {
        const data = await api<{ repos: string[] }>("/api/miniapp/repos");
        setRepos(data.repos);
        return data.repos;
    }, []);

    const handleLoadRepos = async () => {
        clearFeedback();
        setLoading(true);
        try {
            await fetchRepos();
            setView("repos");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load repos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if ((view === "create" || view === "issues") && repos.length === 0) {
            fetchRepos().catch(() => {});
        }
    }, [view, repos.length, fetchRepos]);

    const handleLoadIssues = async () => {
        clearFeedback();
        const [owner, repo] = selectedRepoForIssues.split("/");
        if (!owner || !repo) {
            setError("Select a repository.");
            return;
        }
        setLoading(true);
        try {
            const data = await api<{ issues: IssueSummary[] }>(
                `/api/miniapp/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
            );
            setIssuesList(data.issues);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load issues");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenIssueDetail = (issueNumber: number) => {
        setSelectedIssueNumber(issueNumber);
        setIssueDetail(null);
        setView("issueDetail");
    };

    const handleCloseIssue = async () => {
        if (!selectedRepoForIssues || selectedIssueNumber == null) return;
        clearFeedback();
        const [owner, repo] = selectedRepoForIssues.split("/");
        if (!owner || !repo) return;
        setLoading(true);
        try {
            await api<{ url: string }>("/api/miniapp/issues/close", {
                method: "POST",
                body: { owner, repo, number: selectedIssueNumber },
            });
            setSuccess("Issue closed.");
            setIssueDetail((prev) => (prev ? { ...prev, state: "closed" } : null));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to close issue");
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
            setConnected(false);
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
                        className="mb-4 rounded-2xl p-3 text-sm"
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
                        {connected === false && (
                            <button
                                type="button"
                                className="rounded-2xl px-4 py-3 font-medium"
                                style={{
                                    backgroundColor: "var(--tg-theme-button-color)",
                                    color: "var(--tg-theme-button-text-color)",
                                }}
                                onClick={() => setView("connect")}
                            >
                                Connect GitHub
                            </button>
                        )}
                        <button
                            type="button"
                            className="rounded-2xl border px-4 py-3 font-medium"
                            style={{
                                borderColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-color)",
                            }}
                            onClick={handleLoadRepos}
                            disabled={loading || connected !== true}
                        >
                            My repositories
                        </button>
                        <button
                            type="button"
                            className="rounded-2xl border px-4 py-3 font-medium"
                            style={{
                                borderColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-color)",
                            }}
                            onClick={() => setView("create")}
                            disabled={loading || connected !== true}
                        >
                            New issue
                        </button>
                        <button
                            type="button"
                            className="rounded-2xl border px-4 py-3 font-medium"
                            style={{
                                borderColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-color)",
                            }}
                            onClick={() => setView("issues")}
                            disabled={loading || connected !== true}
                        >
                            View issues
                        </button>
                        {connected === true && (
                            <button
                                type="button"
                                className="mt-2 text-sm opacity-70"
                                onClick={handleDisconnect}
                                disabled={loading}
                            >
                                Disconnect GitHub
                            </button>
                        )}
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
                            Paste your GitHub Personal Access Token. Required: scope «repo» (classic) or Issues + Metadata (fine-grained).
                        </p>
                        <input
                            type="password"
                            placeholder="ghp_..."
                            className="w-full rounded-2xl border px-3 py-2"
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
                            className="rounded-2xl px-4 py-3 font-medium disabled:opacity-50"
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
                        <ul className="max-h-64 list-none overflow-auto rounded-2xl border p-0">
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
                        <label htmlFor="repo" className="text-sm opacity-80">Repo</label>
                        <select
                            id="repo"
                            className="w-full rounded-2xl border px-3 py-2"
                            value={selectedRepo}
                            onChange={(e) => setSelectedRepo(e.target.value)}
                            style={{
                                borderColor: "var(--tg-theme-hint-color)",
                                backgroundColor: "var(--tg-theme-bg-color)",
                                color: "var(--tg-theme-text-color)",
                            }}
                        >
                            <option value="">Select repository</option>
                            {repos.map((fullName) => (
                                <option key={fullName} value={fullName}>
                                    {fullName}
                                </option>
                            ))}
                        </select>
                        <label htmlFor="title" className="text-sm opacity-80">Title</label>
                        <input
                            id="title"
                            type="text"
                            placeholder="Issue title"
                            className="w-full rounded-2xl border px-3 py-2"
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
                            className="w-full rounded-2xl border px-3 py-2"
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
                            className="rounded-2xl px-4 py-3 font-medium disabled:opacity-50"
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

                {view === "issues" && (
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            className="self-start text-sm opacity-70"
                            onClick={() => setView("home")}
                        >
                            ← Back
                        </button>
                        <h2 className="text-lg font-semibold">View issues</h2>
                        <label htmlFor="issues-repo" className="text-sm opacity-80">Repository</label>
                        <select
                            id="issues-repo"
                            className="w-full rounded-2xl border px-3 py-2"
                            value={selectedRepoForIssues}
                            onChange={(e) => {
                                setSelectedRepoForIssues(e.target.value);
                                setIssuesList([]);
                            }}
                            style={{
                                borderColor: "var(--tg-theme-hint-color)",
                                backgroundColor: "var(--tg-theme-bg-color)",
                                color: "var(--tg-theme-text-color)",
                            }}
                        >
                            <option value="">Select repository</option>
                            {repos.map((fullName) => (
                                <option key={fullName} value={fullName}>
                                    {fullName}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="rounded-2xl px-4 py-3 font-medium disabled:opacity-50"
                            style={{
                                backgroundColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-text-color)",
                            }}
                            onClick={handleLoadIssues}
                            disabled={loading || !selectedRepoForIssues}
                        >
                            {loading ? "Loading…" : "Load issues"}
                        </button>
                        {issuesList.length > 0 && (
                            <ul className="max-h-64 list-none overflow-auto rounded-2xl border p-0" style={{ borderColor: "var(--tg-theme-hint-color)" }}>
                                {issuesList.map((issue) => (
                                    <li key={issue.number} className="border-b last:border-b-0" style={{ borderColor: "var(--tg-theme-hint-color)" }}>
                                        <button
                                            type="button"
                                            className="w-full p-3 text-left"
                                            onClick={() => handleOpenIssueDetail(issue.number)}
                                        >
                                            <span className="font-medium">#{issue.number}</span> {issue.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {issuesList.length === 0 && selectedRepoForIssues && !loading && (
                            <p className="text-sm opacity-80">No open issues. Load issues or select another repo.</p>
                        )}
                    </div>
                )}

                {view === "issueDetail" && selectedIssueNumber != null && selectedRepoForIssues && (
                    <IssueDetailView
                        ownerRepo={selectedRepoForIssues}
                        issueNumber={selectedIssueNumber}
                        issueDetail={issueDetail}
                        setIssueDetail={setIssueDetail}
                        onBack={() => {
                            setView("issues");
                            setSelectedIssueNumber(null);
                            setIssueDetail(null);
                        }}
                        onCloseIssue={handleCloseIssue}
                        loading={loading}
                        error={error}
                        success={success}
                    />
                )}
            </div>
    );
}

function IssueDetailView({
    ownerRepo,
    issueNumber,
    issueDetail,
    setIssueDetail,
    onBack,
    onCloseIssue,
    loading,
    error,
    success,
}: {
    ownerRepo: string;
    issueNumber: number;
    issueDetail: IssueSummary | null;
    setIssueDetail: (v: IssueSummary | null) => void;
    onBack: () => void;
    onCloseIssue: () => Promise<void>;
    loading: boolean;
    error: string;
    success: string;
}) {
    const [fetchError, setFetchError] = useState("");
    useEffect(() => {
        const [owner, repo] = ownerRepo.split("/");
        if (!owner || !repo) return;
        let cancelled = false;
        setFetchError("");
        fetch(`/api/miniapp/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&number=${issueNumber}`, {
            headers: { "x-telegram-init-data": getInitData() },
        })
            .then((r) => r.json())
            .then((data) => {
                if (!cancelled && data.number !== undefined) setIssueDetail(data as IssueSummary);
                else if (!cancelled && (data as { error?: string }).error) setFetchError((data as { error: string }).error);
            })
            .catch(() => { if (!cancelled) setFetchError("Failed to load issue"); });
        return () => { cancelled = true; };
    }, [ownerRepo, issueNumber, setIssueDetail]);

    const isOpen = issueDetail?.state === "open";
    return (
        <div className="flex flex-col gap-3">
            <button type="button" className="self-start text-sm opacity-70" onClick={onBack}>
                ← Back
            </button>
            <h2 className="text-lg font-semibold">Issue #{issueNumber}</h2>
            {(fetchError || error) && (
                <div className="rounded-2xl p-3 text-sm" style={{ backgroundColor: "var(--tg-theme-hint-color)", color: "var(--tg-theme-button-text-color)" }}>
                    {fetchError || error}
                </div>
            )}
            {success && (
                <div className="rounded-2xl p-3 text-sm" style={{ backgroundColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}>
                    {success}
                </div>
            )}
            {!issueDetail && !fetchError && (
                <p className="text-sm opacity-80">Loading…</p>
            )}
            {issueDetail && (
                <>
                    <p className="font-medium">{issueDetail.title}</p>
                    <p className="text-sm opacity-80">State: {issueDetail.state}</p>
                    <p className="text-sm whitespace-pre-wrap">{issueDetail.body ?? "(no description)"}</p>
                    <a href={issueDetail.html_url} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: "var(--tg-theme-button-color)" }}>
                        Open on GitHub
                    </a>
                    {isOpen && (
                        <button
                            type="button"
                            className="rounded-2xl px-4 py-3 font-medium disabled:opacity-50"
                            style={{
                                backgroundColor: "var(--tg-theme-button-color)",
                                color: "var(--tg-theme-button-text-color)",
                            }}
                            onClick={onCloseIssue}
                            disabled={loading}
                        >
                            {loading ? "Closing…" : "Close issue"}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
