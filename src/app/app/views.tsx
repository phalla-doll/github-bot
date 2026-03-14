"use client";

export type IssueSummary = {
    number: number;
    title: string;
    state: string;
    html_url: string;
    body?: string | null;
};

const inputStyle = {
    borderColor: "var(--tg-theme-hint-color)",
    backgroundColor: "var(--tg-theme-bg-color)",
    color: "var(--tg-theme-text-color)",
};
const buttonStyle = {
    backgroundColor: "var(--tg-theme-button-color)",
    color: "var(--tg-theme-button-text-color)",
};
const borderButtonStyle = {
    borderColor: "var(--tg-theme-button-color)",
    color: "var(--tg-theme-button-color)",
};

export function LoadingMessage({ children }: { children: React.ReactNode }) {
    return <p className="text-sm opacity-80">{children}</p>;
}

export function HomeView({
    connected,
    statusLoading,
    loading,
    reposLoading,
    onConnect,
    onLoadRepos,
    onCreateIssue,
    onViewIssues,
    onDisconnect,
}: {
    connected: boolean | null;
    statusLoading: boolean;
    loading: boolean;
    reposLoading: boolean;
    onConnect: () => void;
    onLoadRepos: () => void;
    onCreateIssue: () => void;
    onViewIssues: () => void;
    onDisconnect: () => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <h1 className="text-lg font-semibold">GitHub Issue Bot</h1>
            {statusLoading && <LoadingMessage>Checking connection…</LoadingMessage>}
            {!statusLoading && connected === false && (
                <button
                    type="button"
                    className="rounded-2xl px-4 py-3 font-medium"
                    style={buttonStyle}
                    onClick={onConnect}
                >
                    Connect GitHub
                </button>
            )}
            {!statusLoading && (
                <>
            <button
                type="button"
                className="rounded-2xl border px-4 py-3 font-medium"
                style={borderButtonStyle}
                onClick={onLoadRepos}
                disabled={loading || connected !== true || reposLoading}
            >
                {reposLoading ? "Loading…" : "My repositories"}
            </button>
            <button
                type="button"
                className="rounded-2xl border px-4 py-3 font-medium"
                style={borderButtonStyle}
                onClick={onCreateIssue}
                disabled={loading || connected !== true || reposLoading}
            >
                New issue
            </button>
            <button
                type="button"
                className="rounded-2xl border px-4 py-3 font-medium"
                style={borderButtonStyle}
                onClick={onViewIssues}
                disabled={loading || connected !== true || reposLoading}
            >
                View issues
            </button>
            {connected === true && (
                <button
                    type="button"
                    className="mt-2 text-sm opacity-70"
                    onClick={onDisconnect}
                    disabled={loading}
                >
                    Disconnect GitHub
                </button>
            )}
                </>
            )}
        </div>
    );
}

export function ConnectView({
    token,
    setToken,
    loading,
    onConnect,
    onBack,
}: {
    token: string;
    setToken: (v: string) => void;
    loading: boolean;
    onConnect: () => void;
    onBack: () => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <button type="button" className="self-start text-sm opacity-70" onClick={onBack}>
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
                style={inputStyle}
            />
            <button
                type="button"
                className="rounded-2xl px-4 py-3 font-medium disabled:opacity-50"
                style={buttonStyle}
                onClick={onConnect}
                disabled={loading || !token.trim()}
            >
                {loading ? "Connecting…" : "Connect"}
            </button>
        </div>
    );
}

export function ReposView({
    repos,
    reposLoading,
    onBack,
}: {
    repos: string[];
    reposLoading: boolean;
    onBack: () => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <button type="button" className="self-start text-sm opacity-70" onClick={onBack}>
                ← Back
            </button>
            <h2 className="text-lg font-semibold">Repositories</h2>
            {reposLoading ? (
                <LoadingMessage>Loading…</LoadingMessage>
            ) : (
                <ul className="max-h-64 list-none overflow-auto rounded-2xl border p-0">
                    {repos.map((fullName) => (
                        <li
                            key={fullName}
                            className="miniapp-list-item border-b p-3 last:border-b-0"
                            style={{ borderColor: "var(--tg-theme-hint-color)" }}
                        >
                            {fullName}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function CreateIssueView({
    repos,
    reposLoading,
    selectedRepo,
    setSelectedRepo,
    title,
    setTitle,
    body,
    setBody,
    loading,
    onBack,
    onCreate,
}: {
    repos: string[];
    reposLoading: boolean;
    selectedRepo: string;
    setSelectedRepo: (v: string) => void;
    title: string;
    setTitle: (v: string) => void;
    body: string;
    setBody: (v: string) => void;
    loading: boolean;
    onBack: () => void;
    onCreate: () => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <button type="button" className="self-start text-sm opacity-70" onClick={onBack}>
                ← Back
            </button>
            <h2 className="text-lg font-semibold">New issue</h2>
            <label htmlFor="repo" className="text-sm opacity-80">Repo</label>
            {reposLoading && <LoadingMessage>Loading repositories…</LoadingMessage>}
            <select
                id="repo"
                className="w-full rounded-2xl border px-3 py-2 disabled:opacity-60"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                style={inputStyle}
                disabled={reposLoading}
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
                style={inputStyle}
            />
            <label htmlFor="body" className="text-sm opacity-80">Description (optional)</label>
            <textarea
                id="body"
                placeholder="Description"
                rows={4}
                className="w-full rounded-2xl border px-3 py-2"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={inputStyle}
            />
            <button
                type="button"
                className="rounded-2xl px-4 py-3 font-medium disabled:opacity-50"
                style={buttonStyle}
                onClick={onCreate}
                disabled={loading || !selectedRepo.trim() || !title.trim()}
            >
                {loading ? "Creating…" : "Create issue"}
            </button>
        </div>
    );
}

export function IssuesListView({
    repos,
    reposLoading,
    selectedRepoForIssues,
    setSelectedRepoForIssues,
    issuesList,
    issuesLoading,
    onLoadIssues,
    onOpenIssueDetail,
    onBack,
}: {
    repos: string[];
    reposLoading: boolean;
    selectedRepoForIssues: string;
    setSelectedRepoForIssues: (v: string) => void;
    issuesList: IssueSummary[];
    issuesLoading: boolean;
    onLoadIssues: () => void;
    onOpenIssueDetail: (issueNumber: number) => void;
    onBack: () => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <button type="button" className="self-start text-sm opacity-70" onClick={onBack}>
                ← Back
            </button>
            <h2 className="text-lg font-semibold">View issues</h2>
            <label htmlFor="issues-repo" className="text-sm opacity-80">Repository</label>
            {reposLoading && <LoadingMessage>Loading repositories…</LoadingMessage>}
            <select
                id="issues-repo"
                className="w-full rounded-2xl border px-3 py-2 disabled:opacity-60"
                value={selectedRepoForIssues}
                onChange={(e) => setSelectedRepoForIssues(e.target.value)}
                style={inputStyle}
                disabled={reposLoading}
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
                style={buttonStyle}
                onClick={onLoadIssues}
                disabled={issuesLoading || !selectedRepoForIssues}
            >
                {issuesLoading ? "Loading…" : "Load issues"}
            </button>
            {issuesLoading && selectedRepoForIssues && (
                <LoadingMessage>Loading issues…</LoadingMessage>
            )}
            {!issuesLoading && issuesList.length > 0 && (
                <ul className="max-h-64 list-none overflow-auto rounded-2xl border p-0" style={{ borderColor: "var(--tg-theme-hint-color)" }}>
                    {issuesList.map((issue) => (
                        <li key={issue.number} className="miniapp-list-item border-b last:border-b-0" style={{ borderColor: "var(--tg-theme-hint-color)" }}>
                            <button
                                type="button"
                                className="w-full p-3 text-left"
                                onClick={() => onOpenIssueDetail(issue.number)}
                            >
                                <span className="font-medium">#{issue.number}</span> {issue.title}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {!issuesLoading && issuesList.length === 0 && selectedRepoForIssues && (
                <LoadingMessage>No open issues. Load issues or select another repo.</LoadingMessage>
            )}
        </div>
    );
}
