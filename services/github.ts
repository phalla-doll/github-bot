import { Octokit } from "@octokit/rest";

export class GitHubError extends Error {
    constructor(
        message: string,
        public code:
            | "invalid_token"
            | "repo_not_found"
            | "rate_limit"
            | "not_owner"
            | "unknown",
    ) {
        super(message);
        this.name = "GitHubError";
    }
}

export async function getAuthenticatedUser(
    token: string,
): Promise<{ login: string }> {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.users.getAuthenticated();
    return { login: data.login };
}

export async function ensureOwnerRepo(
    token: string,
    owner: string,
): Promise<void> {
    let login: string;
    try {
        const user = await getAuthenticatedUser(token);
        login = user.login;
    } catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e) {
            const s = (e as { status: number }).status;
            if (s === 401)
                throw new GitHubError("Invalid token", "invalid_token");
            if (s === 403 || s === 429)
                throw new GitHubError("Rate limit", "rate_limit");
        }
        throw e;
    }
    if (owner !== login) {
        throw new GitHubError(
            "You can only use repos you own.",
            "not_owner",
        );
    }
}

export async function validateToken(token: string): Promise<boolean> {
    try {
        const octokit = new Octokit({ auth: token });
        await octokit.rest.users.getAuthenticated();
        return true;
    } catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e) {
            if ((e as { status: number }).status === 401) return false;
            if ((e as { status: number }).status === 403 && "response" in e) {
                const r = (
                    e as { response?: { headers?: Record<string, string> } }
                ).response;
                if (r?.headers?.["x-ratelimit-remaining"] === "0")
                    throw new GitHubError("Rate limit", "rate_limit");
            }
        }
        throw new GitHubError("Validation failed", "unknown");
    }
}

export async function listRepos(
    token: string,
): Promise<{ fullName: string }[]> {
    const octokit = new Octokit({ auth: token });
    try {
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
            sort: "updated",
            per_page: 100,
            type: "owner",
        });
        return data.map((r) => ({ fullName: r.full_name }));
    } catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e) {
            const s = (e as { status: number }).status;
            if (s === 401)
                throw new GitHubError("Invalid token", "invalid_token");
            if (s === 403 || s === 429)
                throw new GitHubError("Rate limit", "rate_limit");
        }
        throw e;
    }
}

export async function createIssue(
    token: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
): Promise<{ htmlUrl: string }> {
    await ensureOwnerRepo(token, owner);
    const octokit = new Octokit({ auth: token });
    try {
        const { data } = await octokit.rest.issues.create({
            owner,
            repo,
            title,
            body: body || undefined,
        });
        return { htmlUrl: data.html_url ?? "" };
    } catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e) {
            const s = (e as { status: number }).status;
            if (s === 401)
                throw new GitHubError("Invalid token", "invalid_token");
            if (s === 404)
                throw new GitHubError("Repo not found", "repo_not_found");
            if (s === 403 || s === 429)
                throw new GitHubError("Rate limit", "rate_limit");
        }
        throw e;
    }
}

export type IssueSummary = {
    number: number;
    title: string;
    state: string;
    html_url: string;
    body?: string | null;
};

export async function getIssue(
    token: string,
    owner: string,
    repo: string,
    issueNumber: number,
): Promise<IssueSummary> {
    await ensureOwnerRepo(token, owner);
    const octokit = new Octokit({ auth: token });
    try {
        const { data } = await octokit.rest.issues.get({
            owner,
            repo,
            issue_number: issueNumber,
        });
        return {
            number: data.number,
            title: data.title ?? "",
            state: data.state ?? "open",
            html_url: data.html_url ?? "",
            body: data.body,
        };
    } catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e) {
            const s = (e as { status: number }).status;
            if (s === 401)
                throw new GitHubError("Invalid token", "invalid_token");
            if (s === 404)
                throw new GitHubError("Issue not found", "repo_not_found");
            if (s === 403 || s === 429)
                throw new GitHubError("Rate limit", "rate_limit");
        }
        throw e;
    }
}

export async function listIssues(
    token: string,
    owner: string,
    repo: string,
    options?: { state?: "open" | "closed" | "all"; per_page?: number },
): Promise<IssueSummary[]> {
    await ensureOwnerRepo(token, owner);
    const octokit = new Octokit({ auth: token });
    try {
        const { data } = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: options?.state ?? "open",
            per_page: options?.per_page ?? 30,
        });
        return data.map((d) => ({
            number: d.number,
            title: d.title ?? "",
            state: d.state ?? "open",
            html_url: d.html_url ?? "",
            body: d.body,
        }));
    } catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e) {
            const s = (e as { status: number }).status;
            if (s === 401)
                throw new GitHubError("Invalid token", "invalid_token");
            if (s === 404)
                throw new GitHubError("Repo not found", "repo_not_found");
            if (s === 403 || s === 429)
                throw new GitHubError("Rate limit", "rate_limit");
        }
        throw e;
    }
}

export async function closeIssue(
    token: string,
    owner: string,
    repo: string,
    issueNumber: number,
): Promise<{ html_url: string }> {
    await ensureOwnerRepo(token, owner);
    const octokit = new Octokit({ auth: token });
    try {
        const { data } = await octokit.rest.issues.update({
            owner,
            repo,
            issue_number: issueNumber,
            state: "closed",
        });
        return { html_url: data.html_url ?? "" };
    } catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e) {
            const s = (e as { status: number }).status;
            if (s === 401)
                throw new GitHubError("Invalid token", "invalid_token");
            if (s === 404)
                throw new GitHubError("Issue not found", "repo_not_found");
            if (s === 403 || s === 429)
                throw new GitHubError("Rate limit", "rate_limit");
        }
        throw e;
    }
}
