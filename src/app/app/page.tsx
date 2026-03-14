"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import useSWR from "swr";
import { ConnectView, CreateIssueView, HomeView, IssuesListView, ReposView, type IssueSummary } from "./views";

type View = "home" | "connect" | "repos" | "create" | "issues" | "issueDetail";

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

const fetcher = <T,>(url: string) => api<T>(url);

export default function MiniAppPage() {
    const [view, setViewState] = useState<View>("home");
    const setView = useCallback((v: View) => {
        startTransition(() => setViewState(v));
    }, []);

    const [initData, setInitData] = useState("");
    const { data: statusData, mutate: mutateStatus } = useSWR(
        initData ? "/api/miniapp/status" : null,
        fetcher<{ connected: boolean }>,
    );
    const connected = statusData === undefined ? null : statusData.connected;

    const reposKey =
        (view === "repos" || view === "create" || view === "issues") && connected
            ? "/api/miniapp/repos"
            : null;
    const { data: reposData, isLoading: reposLoading } = useSWR(
        reposKey,
        fetcher<{ repos: string[] }>,
    );
    const repos = reposData?.repos ?? [];

    const [token, setToken] = useState("");
    const [selectedRepo, setSelectedRepo] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedRepoForIssues, setSelectedRepoForIssues] = useState("");
    const [requestedIssuesForRepo, setRequestedIssuesForRepo] = useState<string | null>(null);
    const [selectedIssueNumber, setSelectedIssueNumber] = useState<number | null>(null);

    const issuesKey = (() => {
        if (!requestedIssuesForRepo) return null;
        const [owner, repo] = requestedIssuesForRepo.split("/");
        if (!owner || !repo) return null;
        return `/api/miniapp/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
    })();
    const { data: issuesData, isLoading: issuesLoading, mutate: mutateIssues } = useSWR(
        issuesKey,
        fetcher<{ issues: IssueSummary[] }>,
    );
    const issuesList = issuesData?.issues ?? [];

    const issueDetailKey =
        view === "issueDetail" && selectedRepoForIssues && selectedIssueNumber != null
            ? (() => {
                const [owner, repo] = selectedRepoForIssues.split("/");
                if (!owner || !repo) return null;
                return `/api/miniapp/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&number=${selectedIssueNumber}`;
            })()
            : null;
    const { data: issueDetail, mutate: mutateIssueDetail } = useSWR(
        issueDetailKey,
        fetcher<IssueSummary>,
    );

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
            mutateStatus();
            setToken("");
            setView("home");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Connect failed");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadRepos = () => {
        clearFeedback();
        setView("repos");
    };

    const handleLoadIssues = () => {
        clearFeedback();
        if (!selectedRepoForIssues.trim()) {
            setError("Select a repository.");
            return;
        }
        setRequestedIssuesForRepo(selectedRepoForIssues);
    };

    const handleOpenIssueDetail = (issueNumber: number) => {
        setSelectedIssueNumber(issueNumber);
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
            if (issuesKey) mutateIssues();
            if (issueDetailKey) mutateIssueDetail();
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
            mutateStatus();
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
                <HomeView
                    connected={connected}
                    loading={loading}
                    reposLoading={reposLoading}
                    onConnect={() => setView("connect")}
                    onLoadRepos={handleLoadRepos}
                    onCreateIssue={() => setView("create")}
                    onViewIssues={() => setView("issues")}
                    onDisconnect={handleDisconnect}
                />
            )}

            {view === "connect" && (
                <ConnectView
                    token={token}
                    setToken={setToken}
                    loading={loading}
                    onConnect={handleConnect}
                    onBack={() => setView("home")}
                />
            )}

            {view === "repos" && (
                <ReposView
                    repos={repos}
                    reposLoading={reposLoading}
                    onBack={() => setView("home")}
                />
            )}

            {view === "create" && (
                <CreateIssueView
                    repos={repos}
                    selectedRepo={selectedRepo}
                    setSelectedRepo={setSelectedRepo}
                    title={title}
                    setTitle={setTitle}
                    body={body}
                    setBody={setBody}
                    loading={loading}
                    onBack={() => setView("home")}
                    onCreate={handleCreateIssue}
                />
            )}

            {view === "issues" && (
                <IssuesListView
                    repos={repos}
                    selectedRepoForIssues={selectedRepoForIssues}
                    setSelectedRepoForIssues={(v) => {
                        setSelectedRepoForIssues(v);
                        setRequestedIssuesForRepo(null);
                    }}
                    issuesList={issuesList}
                    issuesLoading={issuesLoading}
                    onLoadIssues={handleLoadIssues}
                    onOpenIssueDetail={handleOpenIssueDetail}
                    onBack={() => setView("home")}
                />
            )}

            {view === "issueDetail" && selectedIssueNumber != null && selectedRepoForIssues && (
                <IssueDetailView
                    issueNumber={selectedIssueNumber}
                    issueDetail={issueDetail}
                    issueDetailLoading={issueDetail === undefined && !!issueDetailKey}
                    onBack={() => {
                        setView("issues");
                        setSelectedIssueNumber(null);
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
    issueNumber,
    issueDetail,
    issueDetailLoading,
    onBack,
    onCloseIssue,
    loading,
    error,
    success,
}: {
    issueNumber: number;
    issueDetail: IssueSummary | undefined;
    issueDetailLoading: boolean;
    onBack: () => void;
    onCloseIssue: () => Promise<void>;
    loading: boolean;
    error: string;
    success: string;
}) {
    const isOpen = issueDetail?.state === "open";
    return (
        <div className="flex flex-col gap-3">
            <button type="button" className="self-start text-sm opacity-70" onClick={onBack}>
                ← Back
            </button>
            <h2 className="text-lg font-semibold">Issue #{issueNumber}</h2>
            {error && (
                <div className="rounded-2xl p-3 text-sm" style={{ backgroundColor: "var(--tg-theme-hint-color)", color: "var(--tg-theme-button-text-color)" }}>
                    {error}
                </div>
            )}
            {success && (
                <div className="rounded-2xl p-3 text-sm" style={{ backgroundColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}>
                    {success}
                </div>
            )}
            {issueDetailLoading && (
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
