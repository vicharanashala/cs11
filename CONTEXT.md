# CrowdFAQ — Project Context

> Context for future sessions. Last updated: 2026-06-16 22:56 GMT+5:30 (TypeScript clean; E2E 28/28; category filtering bug fixed; all Phase 2 features complete).

**Quick orientation for new sessions:**
- `manual_checklist.md` — setup steps (Ollama/HuggingFace, env vars, rebuild-index)
- `CURRENT_FEATURES.md` — complete inventory of what works right now
- `PHASE2_CHECKLIST.md` — pending items (mostly superadmin)
- `FUTURE_FEATURES.md` — ideas and enhancements for later
- `memory/` — daily session logs
- `FRONTEND_ISSUES.md` — original 2026-05-29 issue list (all resolved)
- `backend/CHUNK_ISSUES.md` — backend known issues (not yet reviewed)

**Current work:** All Phase 2 features complete. Superadmin pages remain the primary gap.

---

## Project Overview

**CrowdFAQ** is a community-driven FAQ platform for student communities. Students ask questions, the community answers and votes, AI matches incoming questions to existing FAQs, and admins step in last.

Two repositories in one monorepo:
- `frontend/` — React 18 + Vite SPA
- `backend/` — NestJS + MongoDB API

---

## Repository Structure

```
faq-query-resolution-system/
├── frontend/          # React SPA
├── backend/           # NestJS API
├── memory/            # Session memory and audit logs
├── manual_checklist.md # Manual setup steps (Ollama/HuggingFace, env, rebuild-index)
├── CURRENT_FEATURES.md # Complete inventory of live features
├── PHASE2_CHECKLIST.md # Pending items
├── FUTURE_FEATURES.md  # Ideas and enhancements for later
├── CONTEXT.md         # This file
├── FRONTEND_ISSUES.md # Original 2026-05-29 issue list (resolved)
└── seed-document-status.js
```

---

## Current State (as of 2026-06-16)

### Frontend ✅ — TypeScript Clean
`npx tsc --noEmit` exit 0. All 25 original FRONTEND_ISSUES resolved. Socket.IO Phase 2 (real-time vote counts, answer creation, status changes, FAQ publishes) wired across 4 route files. Reputation `/reputation` page + Navbar badge for interns. Category filtering fixed on resolve/admin-queue pages (questions no longer vanish when a category is selected).

### Backend ✅ — TypeScript Clean
`npx tsc --noEmit` exit 0. `aiMatchFaqId` persisted on question create. HuggingFace provider extracted to `providers/huggingface.provider.ts`. `ReputationService` is the sole mutation point for all reputation changes. Category field stored as proper ObjectId on questions (not raw value). `getQueryQueue()` aggregation pipeline has its own `$lookup categories` + `$match category.slug` when filtering.

### E2E Tests ✅ — 28/28 Passing
Across 4 spec files: `auth`, `voting`, `questions`, `admin`. Run with `npm run test:e2e` from `backend/`. Uses `mongodb-memory-server`. `rebuild-index` test now passes (previously false-negative due to `FaqEmbeddingsService.rebuildAll()` not throwing when all AI batches fail).

---

## Frontend

**Stack:**
- React 18 + Vite 6 (dev: `npm run dev` → port 5173)
- TanStack Router v1 (code-based type-safe routing, manually defined routes in `__root.tsx`)
- TanStack Query v5 (server state, infinite pagination, optimistic updates)
- Tailwind CSS v3
- Axios (HTTP client)
- Socket.IO client (`socket.io-client`)
- JWT decode (client-side token parsing)

**Env:** Copy `.env.example` to `.env` and set `VITE_API_URL` (default: `http://localhost:3000/api`). Vite proxies `/api` to the backend.

**Dev runner:** `npm run dev` inside `frontend/`

---

### Frontend Directory Layout

```
frontend/src/
├── main.tsx              # Entry: QueryClient → AuthProvider → RouterProvider
├── index.css             # Tailwind imports
├── routes/
│   ├── __root.tsx        # Router tree + auth guards (TanStack Router)
│   ├── login.tsx         # Login page
│   ├── signup.tsx        # Signup page
│   ├── faqs.tsx          # FAQ browse/search grid (main landing page) + useSocket wired
│   ├── faqs.$id.tsx      # FAQ detail + voting + feedback + useSocket wired
│   ├── ask.tsx           # Ask page: intent detection, AI match, document status card
│   ├── questions.tsx     # My Questions page
│   ├── questions.$id.tsx # Question detail + answers + accept flow + useSocket wired
│   ├── reputation.tsx    # Reputation score + earning guide + paginated history
│   ├── admin.tsx         # Admin layout with sidebar
│   ├── admin.queries.tsx # Resolution queue — Socket.IO event-driven invalidation (no polling)
│   ├── admin.faqs.tsx    # FAQ manager + Rebuild AI Index
│   ├── admin.flags.tsx   # Flag review queue (pending/reviewed/dismissed/resolved tabs)
│   └── admin.analytics.tsx # Analytics dashboard + Query Insights tab
├── components/
│   ├── Navbar.tsx        # Top nav with user dropdown + logout + reputation badge (interns)
│   ├── FaqCard.tsx       # Card for FAQ list items (markdown stripping with bug 13 fix)
│   ├── SearchBar.tsx     # Debounced search input (baseRoute prop)
│   ├── CategoryFilter.tsx # Category pills (useSearch-driven, baseRoute prop)
│   ├── QuestionForm.tsx  # Shared question form (mutation injection pattern; bug 12 fix)
│   ├── SubmitAnswerForm.tsx # Answer submission with error clearing (bug 11 fix)
│   ├── AnswerCard.tsx    # Answer with voting + accept button + FlagButton (colour-coded score)
│   ├── AiSuggestionBanner.tsx # AI match banner (matched FAQ + confidence %)
│   ├── DocumentStatusCard.tsx # Intent-match document status display
│   ├── WelcomeBanner.tsx # First-time intern welcome (fires PATCH once)
│   ├── FlagButton.tsx    # Flag/report trigger icon button
│   ├── FlagModal.tsx     # Reason dropdown + optional comment
│   └── admin/
│       ├── FaqManagerPanel.tsx # Paginated FAQ table + create/edit forms
│       ├── QueryCard.tsx       # Queue item with resolve form + promote modal + category badge
│       ├── AnalyticsWidget.tsx # MetricWidget, StatusBar, ContributorRow
│       └── CategoryCoverageCard.tsx # Per-category coverage gap + create FAQ shortcut
├── contexts/
│   └── AuthContext.tsx   # AuthProvider: login/logout/token/user; exposes both _id and id (bug 6 fix)
├── hooks/
│   ├── useAuth.ts        # Returns AuthContext value
│   ├── useFaq.ts         # Single FAQ query
│   ├── useFaqs.ts        # Infinite query (maps totalCount → total for pagination)
│   ├── useSocket.ts      # Global Socket.IO singleton; on/off/emit methods; auto-disconnect
│   ├── useReputation.ts  # Reputation score + history query
│   └── useQueryClusters.ts # Admin query insights (category coverage)
├── lib/
│   ├── api.ts            # Axios instance: baseURL from env, JWT interceptor, 401 → /login redirect
│   └── queryClient.ts    # QueryClient: staleTime 2min, retry 1, refetchOnWindowFocus false
├── types/
│   └── index.ts          # All TS interfaces: User, FAQ, Question, Answer, Flag, Category,
│                         # ReputationEvent, ReputationHistory, PaginatedResponse, StatusRecord, etc.
└── utils/
    └── roles.ts          # Role helpers: hasRole, isAdminOrAbove, isSuperadmin, canVote, canAsk,
                          # canModerate, canManageSystem
```

---

### Frontend Routes

All routes defined in `src/routes/__root.tsx`. Auth guards are `beforeLoad` hooks (no external library).

| Route | Component | Auth | Status |
|---|---|---|---|
| `/` | → redirects to `/faqs` | — | ✅ |
| `/login` | `LoginPage` | redirect if logged in | ✅ |
| `/signup` | `SignupPage` | redirect if logged in | ✅ |
| `/faqs` | `FaqsPage` | required | ✅ Real-time via `faq:published` |
| `/faqs/:id` | `FaqDetailPage` | required | ✅ Real-time via `vote:updated` |
| `/ask` | `AskPage` | required | ✅ |
| `/questions` | `QuestionsPage` | required | ✅ |
| `/questions/:id` | `QuestionDetailPage` | required | ✅ Real-time: votes, answer, status |
| `/reputation` | `ReputationPage` | required + intern only | ✅ Score + earning guide + history |
| `/admin` | `AdminPage` | admin+ | ✅ Layout wrapper with sidebar |
| `/admin/queries` | `AdminQueriesPage` | admin+ | ✅ Event-driven invalidation (no polling) |
| `/admin/flags` | `AdminFlagsPage` | admin+ | ✅ Flag review (tabbed) |
| `/admin/faqs` | `AdminFaqsPage` | admin+ | ✅ FAQ manager + Rebuild AI Index |
| `/admin/analytics` | `AdminAnalyticsPage` | admin+ | ✅ Stats + Query Insights tab |

**Key patterns used in pages:**
- `useSearch()` from TanStack Router for URL-driven filters (search, category)
- `useMutation` + `queryClient.setQueryData` for optimistic voting on FAQ detail
- `navigate({ routeMask: baseRoute, search: fn })` for filter updates (SearchBar, CategoryFilter)
- Category filtering on admin queue pages drives `?category=<slug>` URL param → resets page to 1

**TanStack Router v1 TypeScript Gotchas:**
- `useSearch`/`useNavigate`/`Link` type inference is fragile with code-based routes. When TypeScript complains, cast the opts object `as any` — runtime behavior is correct.
- `navigate('/path')` (string) fails type-check. Use `navigate({ to: '/path' } as any)`.
- `Link` component does NOT support `exact` prop in v1. Use `activeOptions={{ exact: true }}`.

---

## Backend

**Stack:** NestJS + Express + Mongoose 8 + MongoDB Atlas + JWT + bcrypt + Socket.IO + Swagger (at `/api/docs`)

**AI Vector Search:** Ollama or HuggingFace Inference API (384-dim embeddings) + application-level cosine similarity. No Python microservice. See `manual_checklist.md` for setup.

**Real-time:** Socket.IO via `EventsGateway` — 4 events: `vote:updated`, `answer:created`, `question:statusChanged`, `faq:published`.

**Env:** `backend/.env` (not committed — see `.env.example`)

**Dev runner:** `npm run start:dev` inside `backend/`

**Modules (NestJS feature modules):**
- `auth` — JWT login/register/me
- `users` — user management + `GET /users/me/reputation` (ReputationService-backed)
- `faqs` — FAQ CRUD, voting, feedback, auto-embedding on create/update/archive
- `questions` — question submission + intent detection + AI matching + voting
- `questions/intent` — `IntentDetectorService` — keyword-based document/status query detection
- `questions/schemas` — `DocumentStatus` schema
- `answers` — answer CRUD + voting + accept + promote-to-FAQ
- `flags` — flag/report system (review/resolve/dismiss endpoints)
- `categories` — category list
- `admin` — admin analytics + meta + rebuild-index
- `reputation` — `ReputationService` + `ReputationEvent` schema (sole mutation point for reputation)
- `events` — `EventsGateway` (Socket.IO)
- `ai` — embeddings abstraction (`EmbeddingsService`) + FAQ embedding management (`FaqEmbeddingsService`)
- `ai/providers` — `HuggingFaceProvider` (cloud), `OllamaProvider` (local), `MockProvider` (dev/test)
- `seed` — database seeder

**API prefix:** All routes prefixed with `/api` (set in `main.ts`)

---

## AI Inference Engine Architecture

Replaces the Python microservice with a pure MERN approach. Two embedding providers are supported:

```
Question submitted
       ↓
checkIntentAndMatch(title + body)
       ↓
 ┌─────────────────────────────────┐
 │ 1. Intent Detection (highest)  │ IntentDetectorService → keyword match
 │    → returns DocumentStatus     │ (NOC / offer letter / internship beginning)
 │    without saving question      │
 └─────────────────────────────────┘
       ↓ (no intent)
 ┌─────────────────────────────────┐
 │ 2. AI FAQ Match                 │ AiMatcherService → FaqEmbeddingsService.findBestMatch
 │    → returns { aiMatch, faq }   │ EmbeddingsService → provider.embedBatch / embedSingle
 └─────────────────────────────────┘
       ↓ (no match)
       → save question to MongoDB
```

**Embedding providers** (`EMBEDDING_PROVIDER` env var):
- `huggingface` (default, cloud) — `HuggingFaceProvider`: native `fetch`, 30s `AbortController` timeout, 384-dim shape validation, `wait_for_model: true`. Requires `HUGGINGFACE_API_KEY` + `HUGGINGFACE_EMBEDDING_MODEL` (default: `sentence-transformers/all-MiniLM-L6-v2`). **Fail-fast if API key missing.**
- `ollama` (local) — `OllamaProvider`: axios, 60s timeout, `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_EMBEDDING_MODEL` (default `nomic-embed-text`).
- `mock` (dev/test) — deterministic pseudo-embeddings, no external dependencies.

**FAQ embedding lifecycle:**
- `FaqsService.create()` / `update()` → `FaqEmbeddingsService.upsert()` (fire-and-forget)
- `FaqsService.archive()` → `FaqEmbeddingsService.removeEmbedding()`
- `POST /admin/rebuild-index` → `FaqEmbeddingsService.rebuildAll()` — batches of 16, bulk upsert. Throws if all batches fail (so `AdminService.rebuildIndex()` returns `{ rebuilt: false, count: 0 }` rather than a false success).

**Question embedding lifecycle:**
- `QuestionsService.create()` → `EmbeddingsService.generateEmbedding(title + body)` → `findByIdAndUpdate(questionId, { questionEmbedding })` (fire-and-forget). Enables future "similar questions" lookups.

**Graceful degradation:** If the embedding provider is down, `findBestMatch()` returns `null` and the question proceeds without AI matching — never blocks the user.

---

## Reputation System

Centralised behind `ReputationService` — the **sole mutation point** for all user reputation. No other service touches `User.reputation` directly.

**6 earning events:**

| Event | Points | Trigger |
|---|---|---|
| `answer_upvoted` | +10 | Upvote added to your answer |
| `answer_downvoted` | −2 | Downvote added to your answer |
| `answer_downvote_reversed` | −5* | Upvote added removes a prior downvote |
| `answer_accepted` | +15 | Question author accepts your answer |
| `question_answered` | +2 | You post an answer |
| `faq_contributed` | +25 | Admin promotes your answer to a FAQ |

*Net effect when a downvote is reversed by an upvote: −2 (downvote reversal) + 10 (new upvote) = +12 total.

**Floor-at-0 clamping:** `award()` fetches the user's current reputation and computes `clampedDelta = Math.max(-currentRep, points)`. The `$inc` uses the clamped value so reputation never goes negative. The `ReputationEvent` history record stores the **intended** points (not the clamped delta), so the user sees the true event description even if their balance was already 0.

**History:** `ReputationEvent` schema has a compound index on `(userId, createdAt)` for efficient paginated queries. `GET /users/me/reputation` returns `{ reputation, history: PaginatedResponse<ReputationEvent> }` with `?page`/`?limit`.

**Wiring:** `AnswersService` calls `ReputationService.award()` for all vote events (added/removed/changed), accept answer, and promote-to-FAQ. All calls are `await`-ed within their parent transaction where possible.

---

## Key Types (Frontend `src/types/index.ts`)

```ts
UserRole: 'intern' | 'admin' | 'superadmin'
User: { _id, name, email, role, reputation, createdAt, updatedAt }
FAQ: { _id, title, body, category, tags, status, author, officialAnswer, votes, upvotes, downvotes, viewCount, resolvedBy, createdAt, updatedAt }
Question: { _id, title, body, askedBy, category, tags, status, aiMatchFaqId, questionEmbedding, votes, upvotes, downvotes, answers, createdAt, updatedAt }
Answer: { _id, questionId, faqId, body, contributedBy, votes, upvotes, downvotes, isAccepted, isOfficialAdminAnswer, createdAt, updatedAt }
Flag: { _id, reporter, targetId, targetType, reason, comment?, status, reviewHistory, createdAt, updatedAt }
ReputationEvent: { _id, userId, event, points, targetId, targetModel, description, createdAt }
ReputationHistory: { reputation, history: PaginatedResponse<ReputationEvent> }
Category: { _id, name, slug, description, color, createdBy, createdAt }
QuestionStatus: 'open' | 'in_progress' | 'resolved' | 'closed'
FaqStatus: 'draft' | 'published' | 'archived'
FlagStatus: 'pending' | 'reviewed' | 'dismissed' | 'resolved'
DocumentType: 'noc' | 'offer_letter_download' | 'offer_letter_acceptance' | 'internship_beginning'
DocumentStatusValue: 'pending' | 'completed' | 'under_review' | 'rejected' | 'requires_resubmission'
PaginatedResponse<T>: { data: T[]; total: number; page: number; limit: number }
```

---

## What Exists vs What's Pending

### ✅ Implemented
- Login + Signup pages with form validation
- FAQ browse page with search + category filter + infinite scroll
- FAQ detail page with voting, feedback, simple markdown rendering
- AuthContext (JWT storage, decode, server validation, logout; bug 6 fix — both `_id` and `id` exposed)
- Axios interceptor (JWT attach + 401 redirect)
- Role helper utilities (including `canManageSystem`, `isSuperadmin`)
- Vite proxy setup
- Intent detection + DocumentStatus flow — `IntentDetectorService` + `DocumentStatusService` + `DocumentStatusCard` frontend
- WelcomeBanner + first-time intern PATCH
- Admin resolution queue — category filter (slug-based URL param, resets page), event-driven Socket.IO invalidation
- Admin FAQ manager + Rebuild AI Index (returns `{ rebuilt, count }`)
- Admin analytics dashboard + Query Insights tab (category coverage gap)
- Flag/report flow — `FlagButton` on FAQ detail + `AnswerCard`; `FlagModal` with reason dropdown + optional comment; `/admin/flags` with 4-tab review queue; backend `flags` module with review/resolve/dismiss endpoints
- Category filtering — `QuestionsService.create()` sets `category` as a proper `Types.ObjectId` (not raw value); `AdminService.getQueryQueue()` aggregation has its own `$lookup categories` + `$match category.slug` + projection of `category.name/slug/color`
- Ollama vector search (MERN-native, no Python microservice)
- HuggingFace Inference API provider (cloud, 384-dim, shape-validated)
- Socket.IO real-time updates — 4 events wired: `vote:updated` (FAQ + answer), `answer:created`, `question:statusChanged`, `faq:published`
- Reputation system — `ReputationService` (sole mutation point, floor-at-0), `ReputationEvent` schema, `GET /users/me/reputation`, `/reputation` page, Navbar badge for interns
- E2E tests — 28/28 passing across 4 spec files

### ⚠️ Needs Implementation
- **Superadmin pages** — backend guards (`canManageSystem`, `isSuperadmin`) exist; no dedicated frontend UI yet

---

## Design Notes

- **Auth:** JWT stored in `localStorage`. `AuthContext` decodes it client-side on load and re-validates with `GET /auth/me`. Both `_id` and `id` (alias) are set on the `AuthUser` object from the same source value. 401 responses auto-redirect to `/login`.
- **Socket.IO:** Global singleton socket in `useSocket` hook. `on`/`off` methods for event listeners with auto-cleanup. `emit` available for future use. Auto-disconnects when the hook unmounts. 4 routes are wired: `questions.$id.tsx`, `faqs.$id.tsx`, `admin.queries.tsx`, `faqs.tsx`. Admin queue uses event-driven `queryClient.invalidateQueries(['admin-queries'])` — the 30s `refetchInterval` is removed.
- **Vote score colour coding:** `AnswerCard` renders vote score in green (positive), red (negative), grey (zero).
- **Markdown stripping:** `FaqCard.stripMarkdown()` handles fenced code blocks, inline code, images, links (→ text only), headings, bold/italic/strikethrough, lists/blockquotes, leftover brackets. Truncation check uses `stripMarkdown(faq.body).length > 120` (bug 13 fix).
- **Form reset on edit:** `SubmitAnswerForm` and `QuestionForm` call `mutation.reset()` on input `onChange`, clearing stale error messages when users edit after a failed submission (bugs 11 & 12 fix).
- **Global exception filter:** `src/common/http-exception.filter.ts` — structured `{ statusCode, message, timestamp, path }` responses. Mongoose `CastError` (invalid ObjectId) → 404. All other exceptions → 500 without leaking internals.
- **ReputationService is the only write path for `User.reputation`:** All `AnswersService.vote()` reputation calls go through `ReputationService.award()`. Direct `$inc` on `User.reputation` does not exist anywhere else in the codebase.
- **Intent detection flow:** `POST /questions` → `QuestionsService.checkIntentAndMatch()` → intent → AI match → null (save). No MongoDB write, no AI call when intent fires. Frontend shows `DocumentStatusCard` on `intentMatch: true`.
- **TanStack Query client:** `frontend/src/lib/queryClient.ts` — `staleTime: 2min`, `retry: 1`, `refetchOnWindowFocus: false`.
- **Admin queue category filtering:** `admin.queries.tsx` uses `useSearch` + `CategoryFilter baseRoute="/admin/queries"`. Selecting a category updates the URL search param → TanStack Query key changes → queue refetches with category filter. Page resets to 1 on category change.
- **rebuild-index returns meaningful counts:** `FaqEmbeddingsService.rebuildAll()` throws if all batches fail (so caller returns `{ rebuilt: false, count: 0 }`). If at least one batch succeeds, returns `faqs.length` (total count, not just successful batches).
- **`aiMatchFaqId` persisted on question create:** Controller Shape 2 captures `intentOrMatch.faq.id` and passes it to `QuestionsService.create()` which stores it as a `Types.ObjectId`. `ask.tsx` `pendingPayload` captures the original mutation variable (2nd `onSuccess` arg) so reject → force-submit posts the correct form data.
- **Document status always returns all 4 document types:** `getStatusForStudent()` always returns all 4 (`noc`, `offer_letter_download`, `offer_letter_acceptance`, `internship_beginning`) with either their actual record or a `null` entry — so the frontend always renders a complete 4-row card.

---

## Related Files

- `memory/2026-06-15.md` — Reputation + Socket.IO + HuggingFace provider refactor session
- `memory/2026-06-16.md` — E2E fix + category filtering bug fix session
- `memory/FRONTEND_AUDIT_2026-06-01.md` — detailed audit log
- `FRONTEND_ISSUES.md` — original 25-issue list (all resolved)
- `backend/CHUNK_ISSUES.md` — backend known issues (pending audit)
- `manual_checklist.md` — manual setup steps (Ollama or HuggingFace, env, rebuild-index)
- `frontend/src/routes/__root.tsx` — definitive route + guard definitions
- `frontend/src/types/index.ts` — all domain types
- `frontend/src/contexts/AuthContext.tsx` — auth state management
- `backend/src/reputation/reputation.service.ts` — ReputationService (sole mutation point)
- `backend/src/ai/providers/huggingface.provider.ts` — HuggingFace provider