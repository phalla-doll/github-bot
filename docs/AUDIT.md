# Full audit: performance & practices

Audit against **Vercel React Best Practices** and **Vercel Composition Patterns** (project-level skills). Scope: app pages, layouts, API routes.

---

## 1. Eliminating waterfalls (CRITICAL)

| Rule | Status | Notes |
|------|--------|--------|
| async-parallel | OK | API routes are sequential by necessity (verify → get token → call GitHub). No independent parallel fetches. |
| async-defer-await | OK | No unnecessary await in unused branches. |
| async-suspense-boundaries | N/A | Main app is client-rendered; no RSC data fetches. |

**API routes**  
- `status`, `repos`, `issues` GET: verify → Convex → (decrypt) → external API. Order is required.  
- No change suggested.

---

## 2. Bundle size (CRITICAL)

| Rule | Status | Notes |
|------|--------|--------|
| bundle-barrel-imports | OK | No barrel imports in app code; no heavy icon/UI libs. |
| bundle-dynamic-imports | OK | No heavy components (e.g. Monaco) that need lazy load. |
| bundle-defer-third-party | OK | Telegram script is needed early; `beforeInteractive` is correct. |

**Suggestion:** If you add `lucide-react` or similar later, use `optimizePackageImports` in `next.config.ts`.

---

## 3. Server-side performance (HIGH)

| Rule | Status | Notes |
|------|--------|--------|
| server-auth-actions | N/A | No Server Actions; all mutations are API routes. |
| server-auth in API routes | OK | Every route verifies `x-telegram-init-data` and (where needed) Convex token. |
| server-cache-react | N/A | Route handlers only; no RSC data layer. |
| server-dedup-props | N/A | No RSC → client props. |
| server-serialization | N/A | No RSC boundaries. |
| server-hoist-static-io | LOW | `getEnv()` builds `ConvexHttpClient` per request. For serverful/long-lived processes, a module-level cached client could reduce overhead. Optional. |

---

## 4. Client-side data fetching (MEDIUM–HIGH)

| Rule | Status | Notes |
|------|--------|--------|
| client-swr-dedup | **Gap** | Status, repos, and issues use raw `fetch` + `useState`. No deduplication or cache; repeated navigations refetch. **Fix:** Use SWR (or similar) for `/api/miniapp/status`, repos, and issues. |
| client-event-listeners | OK | No shared global event listeners. |
| client-passive-event-listeners | N/A | No scroll/touch listeners. |

**Recommendation:** Introduce SWR for status, repos, issues list, and issue detail to get request deduplication, caching, and revalidation.

---

## 5. Re-render optimization (MEDIUM)

| Rule | Status | Notes |
|------|--------|--------|
| rerender-no-inline-components | OK | `IssueDetailView` is defined in the same file but not inside another component. |
| rerender-derived-state | OK | `isOpen` in `IssueDetailView` is derived during render (`issueDetail?.state === "open"`). |
| rerender-functional-setstate | OK | `setIssueDetail(prev => ...)` used where update depends on previous state. |
| rerender-memo / extract components | **Gap** | Single large page component with many `useState`s; any state change re-renders the whole tree. **Fix:** Split into view components (e.g. `HomeView`, `ConnectView`, `ReposView`, `CreateIssueView`, `IssuesListView`) so only the active view re-renders. React Compiler is on, but smaller components still help. |

---

## 6. Rendering performance (MEDIUM)

| Rule | Status | Notes |
|------|--------|--------|
| rendering-conditional-render | OK | Conditions like `issuesList.length > 0 && ...` are safe (no rendering of `0`). |
| rendering-content-visibility | **Gap** | Long lists (repos, issues) have no `content-visibility`. **Fix:** Add `content-visibility: auto` (and optional `contain-intrinsic-size`) for list items in scroll containers. |
| rendering-hoist-jsx | OK | No large static JSX worth hoisting. |
| rendering-usetransition-loading | LOW | Loading is driven by async handlers; could use `useTransition` for non-urgent UI updates. Optional. |

---

## 7. JavaScript performance (LOW–MEDIUM)

| Rule | Status | Notes |
|------|--------|--------|
| js-* | OK | No hot loops, repeated `.find()` chains, or layout thrashing in reviewed code. |

---

## 8. Composition & architecture (HIGH)

| Rule | Status | Notes |
|------|--------|--------|
| architecture-avoid-boolean-props | OK | Navigation is driven by a single `view` state (enum), not many booleans. |
| architecture-compound-components | **Optional** | Could wrap the mini-app in a provider (e.g. `MiniAppProvider`) with `state` + `actions` + `meta`, and use compound components for layout and views. Current structure is acceptable; refactor when you need reuse or testing. |
| patterns-explicit-variants | **Gap** | Views are branches (`view === "home"` etc.). **Fix:** Prefer explicit components (`HomeView`, `ConnectView`, …) for clarity and smaller re-render scope. |
| state-lift-state | **Optional** | Lifting state into a provider would align with composition patterns and make it easier to share state (e.g. with a header or sidebar) without prop drilling. |

---

## 9. Scripts & layout

| Item | Status |
|------|--------|
| Telegram script | OK – `next/script` with `strategy="beforeInteractive"`. |
| Root layout | OK – `next/font` (Geist), no analytics in critical path. |

---

## 10. Summary of recommended changes

1. **Client data fetching:** Use SWR for status, repos, issues list, and issue detail (deduplication, cache, revalidation).
2. **Rendering:** Add `content-visibility: auto` (and optional `contain-intrinsic-size`) for list items in scrollable areas.
3. **Re-renders / composition:** Extract views into components (`HomeView`, `ConnectView`, `ReposView`, `CreateIssueView`, `IssuesListView`) and keep `IssueDetailView`; consider a small provider + compound structure later if the app grows.

Optional: module-level cached Convex client in API routes; `useTransition` for non-urgent updates; full compound-component + provider refactor.

---

## Implemented (this audit)

- **SWR for status:** `/api/miniapp/status` now uses `useSWR`; `mutateStatus()` is called after connect/disconnect.
- **SWR for repos:** Repos are fetched via SWR when view is `repos`, `create`, or `issues`; cached and deduplicated.
- **content-visibility:** `.miniapp-list-item` in `globals.css` with `content-visibility: auto` and `contain-intrinsic-size: 0 52px`; applied to repo list and issues list items.
- **List loading state:** Repos view shows "Loading…" while SWR is fetching.
