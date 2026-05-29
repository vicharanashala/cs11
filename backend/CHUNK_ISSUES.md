# Chunk Issues — Cross-Chunk Coordination

Updated after staleness tracking implementation (end of Chunk 5).

---

## Issue 1 — `answers` populate in `findById` references non-existent field
**File:** `src/questions/questions.service.ts` — `findById()`
**Status: ✅ Resolved in Chunk 4**
- `answers: Types.ObjectId[]` added to Question schema
- `findById` no longer tries to populate answers

---

## Issue 2 — Question missing `votes[]` array
**File:** `src/questions/question.schema.ts`
**Status: ✅ Resolved in Chunk 4**
- `votes: [{ userId, value }]` added to Question schema

---

## Issue 3 — `aiMatchFaqId` not recorded on `forceSubmit`
**File:** `src/questions/question.schema.ts`
**Status: Open**
- `aiMatchFaqId` is null when student forces submission
- `aiMatchRate` analytics will be undercounted as a result
- Revisit in Phase 2

---

## Issue 4 — `rebuild-index` endpoint on AI service
**File:** `src/answers/answers.service.ts`, `src/admin/admin.service.ts`
**Status: Open — AI side needs to implement `POST /rebuild-index`**
- Both callers fire the endpoint
- Staleness tracking ensures failures are observable via `indexStalenessHours` in analytics
- On failure, `lastIndexRebuild` timestamp is NOT updated — staleness grows in the dashboard

---

## Issue 5 — Question vote handling service
**File:** `src/questions/questions.service.ts`
**Status: Open**
- Question schema has `votes[]` array but no vote toggle/flip method
- Needs `questions.vote()` mirroring `answers.vote()` logic
- To be implemented when voting is wired up to frontend

---

## Issue 6 — Staleness tracking now implemented ✅
**Files:** `src/admin/meta.schema.ts`, `meta.module.ts`, `meta.service.ts`
**Status: ✅ Resolved**
- `Meta` collection with single document `{ _id: 'global', lastIndexRebuild: Date }`
- `lastIndexRebuild` stamped ONLY on successful AI index rebuild
- `GET /admin/analytics` returns `indexStalenessHours` (null if never rebuilt)
- Failures are observable: `indexStalenessHours` keeps growing until a successful rebuild

---

## Issue 7 — Duplicate axios instances with different base URLs (frontend)
**Files:** `src/lib/api.ts` vs `src/services/api.ts`
**Status: ✅ Resolved (Chunk 7 Group B)**
- `useAuth.ts` migrated: `@/services/api` → `@/lib/api`
- `services/auth.ts` migrated: `./api` → `@/lib/api`
- `src/services/api.ts` deleted
- `src/hooks/useVote.ts` deleted (was only other consumer; useVote was dead code — never imported anywhere)
- All frontend API calls now use `@/lib/api` (baseURL: `VITE_API_URL || '/api'`)

---

## Issue 8 — `useVote` hook POSTs to `/votes` but backend has no such route
**File:** `src/hooks/useVote.ts`
**Status: ✅ Resolved (Chunk 7 Group B) — deleted as dead code**
- `useVote` hook confirmed to be imported nowhere in the codebase
- FAQ voting in `faqs.$id.tsx` already uses direct inline `api.post('/faqs/${id}/vote')` — correct pattern
- Answer voting will follow the same direct inline pattern when implemented
- Hook deleted; no backend route needed

---

## Issue 9 — `Outlet` imported from `@tanstack/react-router` in `__root.tsx`
**File:** `src/routes/__root.tsx`
**Status: ✅ Resolved (Chunk 7 Group A)**
- `Outlet` now imported from `react-router-dom`
- Page component imports moved to top of file for clarity

---

## Issue 10 — Double `AuthProvider` wrapping
**File:** `src/routes/__root.tsx` + `src/main.tsx`
**Status: ✅ Resolved (Chunk 7 Group A)**
- `<AuthProvider>` wrapper removed from `__root.tsx` rootRoute component
- Single `<AuthProvider>` in `main.tsx` now the only instance

---

## Issue 11 — `__root.tsx` mixes `@tanstack/react-router` and `react-router-dom`
**File:** `src/routes/__root.tsx`
**Status: ✅ Resolved (Chunk 7 Group A)**
- `Outlet` now correctly imported from `react-router-dom`
- Page components (LoginPage, SignupPage, FaqsPage, FaqDetailPage) are standard React components and don't need TanStack-specific imports at the route-tree level
- Remaining mixed usage in page components (useNavigate, useSearch) still needs audit — see Issue 13

---

## Issue 12 — TanStack Router `useSearch` type mismatch in CategoryFilter
**File:** `src/components/CategoryFilter.tsx`, `src/components/SearchBar.tsx`, `src/routes/faqs.tsx`
**Status: ✅ Resolved (Chunk 7 Group D)**
- All `useSearch` calls now use explicit generic: `useSearch<{ ... }>({ from: '/faqs' })`
- Casts (`as { ... }`) removed from `CategoryFilter`, `SearchBar`, and `FaqsPage`
- Also fixed `useEffect` deps lint warning in `SearchBar`