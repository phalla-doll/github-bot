# Plan: Performance & practices follow-up

Plan for the remaining audit items from [AUDIT.md](./AUDIT.md). Order is chosen to minimize rework and risk.

---

## Phase 1: Extract view components (composition + re-renders)

**Goal:** Replace inline view branches with explicit components so only the active view subtree re-renders and the code matches composition patterns.

**Steps:**

1. **Create view components** (in `src/app/app/page.tsx` or split into `src/app/app/views/` if preferred):
   - `HomeView` – props: `{ connected, loading, reposLoading, onConnect, onLoadRepos, onCreateIssue, onViewIssues, onDisconnect }`
   - `ConnectView` – props: `{ token, setToken, loading, error, onConnect, onBack }`
   - `ReposView` – props: `{ repos, reposLoading, onBack }`
   - `CreateIssueView` – props: `{ repos, reposLoading, selectedRepo, setSelectedRepo, title, setTitle, body, setBody, loading, onBack, onCreate }`
   - `IssuesListView` – props: `{ repos, selectedRepoForIssues, setSelectedRepoForIssues, issuesList, loading, onLoadIssues, onOpenIssueDetail, onBack }`

2. **Keep `IssueDetailView`** as-is (already a separate component).

3. **Refactor `MiniAppPage`:**
   - Keep single `view` state and all handlers.
   - Replace each `{view === "…" && ( … )}` block with `<ViewName ... />` and pass the props above.
   - Ensure feedback (error/success) and loading still work; pass `loading`/`error`/`success` only where needed (e.g. `HomeView`, `ConnectView`, `IssueDetailView`).

4. **Verify:** No behavior change; only structure. Manual test: home → connect → repos → create issue → view issues → issue detail → back.

**Outcome:** Clearer structure, smaller re-render scope per view, explicit variants (composition-pattern aligned).

---

## Phase 2: SWR for issues list and issue detail

**Goal:** Use SWR for issues list and single-issue fetch so they are cached and deduplicated.

**Steps:**

1. **Issues list**
   - Add a key derived from selected repo, e.g. `issuesKey = selectedRepoForIssues ? \`/api/miniapp/issues?owner=...&repo=...\` : null` (only when user has picked a repo and clicked “Load issues” or similar).
   - Use `useSWR(issuesKey, fetcher)` and derive `issuesList` from `data?.issues ?? []`.
   - Replace manual “Load issues” fetch with either:
     - Enabling the key when “Load issues” is clicked (e.g. set `issuesRequestedForRepo` to `selectedRepoForIssues` so `issuesKey` becomes non-null), or
     - A dedicated “Load issues” button that triggers `mutate(issuesKey)` so SWR revalidates.
   - Use `isLoading` from SWR for the issues list loading state.

2. **Issue detail**
   - In `IssueDetailView`, add `useSWR` for the single-issue URL, e.g. `/api/miniapp/issues?owner=...&repo=...&number=...`, when `ownerRepo` and `issueNumber` are set.
   - Replace the current `useEffect` + `fetch` with SWR; use `data` as `issueDetail` and call `setIssueDetail(data)` (or pass a mutate) when you need to update local state after “Close issue”.
   - After closing an issue, call `mutate(issueDetailKey)` (and optionally mutate the issues list key) so cache stays correct.

3. **Shared fetcher**
   - Reuse the same `api`-based fetcher (with Telegram init data) for these SWR keys so headers stay consistent.

**Outcome:** Issues list and issue detail cached and deduplicated; fewer duplicate requests when switching repos or reopening the same issue.

---

## Phase 3: Optional improvements

**Goal:** Small, low-risk improvements from the audit.

**3a. useTransition for non-urgent updates (optional)**

- Identify state updates that don’t need to block the UI (e.g. setting “view” after navigation, or updating a list after a background refetch).
- Wrap those updates in `startTransition(() => { ... })` so React can keep input and animations responsive.
- Prefer applying this where you already have loading states (e.g. after SWR mutate or after navigation).

**3b. Module-level Convex client in API routes (optional)**

- **Only if** your deployment is long-lived (e.g. Node server), add a shared module that builds `ConvexHttpClient` once from env (e.g. `getEnv()` cached in a module-level variable, with a simple “already initialized” guard).
- Use that client in all miniapp API routes instead of creating a new client per request.
- **Skip** if you run on short-lived serverless; per-request clients are then acceptable.

**Outcome:** Slightly better responsiveness (3a) and, where applicable, less per-request overhead (3b).

---

## Order and dependencies

| Phase | Depends on | Risk |
|-------|------------|------|
| 1 – View extraction | None | Low – refactor only |
| 2 – SWR issues | None (Phase 1 optional) | Low – additive |
| 3 – Optional | None | Low |

Recommended order: **Phase 1 → Phase 2 → Phase 3** (or Phase 2 first if you want caching gains before refactoring views).

---

## Checklist (copy for tracking)

**Status:** Implemented (Phases 1–3).

- [x] Phase 1: Extract HomeView, ConnectView, ReposView, CreateIssueView, IssuesListView
- [ ] Phase 1: Refactor MiniAppPage to render view components
- [ ] Phase 2: SWR for issues list (key + mutate on “Load issues”)
- [ ] Phase 2: SWR for issue detail in IssueDetailView
- [ ] Phase 2: Mutate issue (and list) cache after close issue
- [ ] Phase 3a: useTransition where appropriate (optional)
- [ ] Phase 3b: Module-level Convex client in API routes (optional)
