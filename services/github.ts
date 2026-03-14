import { Octokit } from "@octokit/rest";

export class GitHubError extends Error {
    constructor(
        message: string,
        public code:
            | "invalid_token"
            | "repo_not_found"
            | "rate_limit"
            | "unknown",
    ) {
        super(message);
        this.name = "GitHubError";
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
