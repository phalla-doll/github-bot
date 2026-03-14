"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type IssueSummary = {
    number: number;
    title: string;
    state: string;
    html_url: string;
    body?: string | null;
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
                <Button onClick={onConnect}>Connect GitHub</Button>
            )}
            {!statusLoading && (
                <>
                    <Button
                        variant="outline"
                        onClick={onLoadRepos}
                        disabled={loading || connected !== true || reposLoading}
                    >
                        {reposLoading ? "Loading…" : "My repositories"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onCreateIssue}
                        disabled={loading || connected !== true || reposLoading}
                    >
                        New issue
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onViewIssues}
                        disabled={loading || connected !== true || reposLoading}
                    >
                        View issues
                    </Button>
                    {connected === true && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={onDisconnect}
                            disabled={loading}
                        >
                            Disconnect GitHub
                        </Button>
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
            <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
                ← Back
            </Button>
            <h2 className="text-lg font-semibold">Connect GitHub</h2>
            <p className="text-sm opacity-80">
                Paste your GitHub Personal Access Token. Required: scope «repo» (classic) or Issues + Metadata (fine-grained).
            </p>
            <Input
                type="password"
                placeholder="ghp_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
            />
            <Button onClick={onConnect} disabled={loading || !token.trim()}>
                {loading ? "Connecting…" : "Connect"}
            </Button>
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
            <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
                ← Back
            </Button>
            <h2 className="text-lg font-semibold">Repositories</h2>
            {reposLoading ? (
                <LoadingMessage>Loading…</LoadingMessage>
            ) : (
                <ul className="max-h-64 list-none overflow-auto rounded-2xl border border-border p-0">
                    {repos.map((fullName) => (
                        <li
                            key={fullName}
                            className="miniapp-list-item border-b border-border p-3 last:border-b-0"
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
            <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
                ← Back
            </Button>
            <h2 className="text-lg font-semibold">New issue</h2>
            <label htmlFor="repo" className="text-sm opacity-80">
                Repo
            </label>
            {reposLoading && <LoadingMessage>Loading repositories…</LoadingMessage>}
            <Select
                value={selectedRepo || null}
                onValueChange={(v) => setSelectedRepo(v ?? "")}
                disabled={reposLoading}
            >
                <SelectTrigger id="repo" className="w-full">
                    <SelectValue placeholder="Select repository" />
                </SelectTrigger>
                <SelectContent>
                    {repos.map((fullName) => (
                        <SelectItem key={fullName} value={fullName}>
                            {fullName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <label htmlFor="title" className="text-sm opacity-80">
                Title
            </label>
            <Input
                id="title"
                type="text"
                placeholder="Issue title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <label htmlFor="body" className="text-sm opacity-80">
                Description (optional)
            </label>
            <textarea
                id="body"
                placeholder="Description"
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={body}
                onChange={(e) => setBody(e.target.value)}
            />
            <Button
                onClick={onCreate}
                disabled={loading || !selectedRepo.trim() || !title.trim()}
            >
                {loading ? "Creating…" : "Create issue"}
            </Button>
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
            <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
                ← Back
            </Button>
            <h2 className="text-lg font-semibold">View issues</h2>
            <label htmlFor="issues-repo" className="text-sm opacity-80">
                Repository
            </label>
            {reposLoading && <LoadingMessage>Loading repositories…</LoadingMessage>}
            <Select
                value={selectedRepoForIssues || null}
                onValueChange={(v) => setSelectedRepoForIssues(v ?? "")}
                disabled={reposLoading}
            >
                <SelectTrigger id="issues-repo" className="w-full">
                    <SelectValue placeholder="Select repository" />
                </SelectTrigger>
                <SelectContent>
                    {repos.map((fullName) => (
                        <SelectItem key={fullName} value={fullName}>
                            {fullName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                onClick={onLoadIssues}
                disabled={issuesLoading || !selectedRepoForIssues}
            >
                {issuesLoading ? "Loading…" : "Load issues"}
            </Button>
            {issuesLoading && selectedRepoForIssues && (
                <LoadingMessage>Loading issues…</LoadingMessage>
            )}
            {!issuesLoading && issuesList.length > 0 && (
                <ul className="max-h-64 list-none overflow-auto rounded-2xl border border-border p-0">
                    {issuesList.map((issue) => (
                        <li
                            key={issue.number}
                            className="miniapp-list-item border-b border-border last:border-b-0"
                        >
                            <Button
                                variant="ghost"
                                className="w-full justify-start p-3 font-normal"
                                onClick={() => onOpenIssueDetail(issue.number)}
                            >
                                <span className="font-medium">#{issue.number}</span> {issue.title}
                            </Button>
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
