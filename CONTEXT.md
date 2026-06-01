# CrowdFAQ — Project Context

> Context for future sessions. Last updated: 2026-06-01.

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
├── frontend/          # React SPA (this is where we work now)
├── backend/           # NestJS API
├── memory/            # Session memory and audit logs
│   ├── 2026-06-01.md
│   └── FRONTEND_AUDIT_2026-06-01.md
├── .gitignore
├── CONTEXT.md         # This file
├── FRONTEND_ISSUES.md # Original 2026-05-29 issue list
└── seed-document-status.js
```

---

## Current State (as of 2026-06-01)

### Frontend ✅ — Audit Complete (22/25 fixed)

TypeScript clean: `npx tsc --noEmit` passes with zero errors.

**22 issues fixed** — all critical and medium severity, plus most minor issues.
See `memory/FRONTEND_AUDIT_2026-06-01.md` for the full fix log.

**3 issues remaining** (minor, to be resolved before backend work):
- `#21` — `fetchCategories` not a hook (minor refactor)
- `#25` — `admin.faqs.tsx` category cell needs defensive type check
- `#22` — "Community Member" fallback — intentional, mark as won't-fix

### Backend ⚠️ — Not yet audited this session

Next: audit `backend/CHUNK_ISSUES.md` and do a full backend code review.

---

## Frontend

**Stack:**
- React 18 + Vite 6 (dev: `npm run dev` → port 5173)
- TanStack Router v1 (file-based type-safe routing, manually defined routes in `__root.tsx`)
- TanStack Query v5 (server state, infinite pagination, optimistic updates)
- Tailwind CSS v3
- Axios (HTTP client)
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
│   ├── faqs.tsx          # FAQ browse/search grid (main landing page)
│   ├── faqs.$id.tsx      # FAQ detail + voting + feedback
│   ├── ask.tsx           # Ask page: intent detection, AI match, document status card
│   ├── questions.tsx     # My Questions page
│   ├── questions.$id.tsx # Question detail + answers + accept flow
│   ├── admin.tsx         # Admin layout with sidebar
│   ├── admin.queries.tsx # Resolution queue (30s auto-refresh)
│   ├── admin.faqs.tsx    # FAQ manager + Rebuild AI Index
│   └── admin.analytics.tsx # Analytics dashboard + Query Insights tab
├── components/
│   ├── Navbar.tsx        # Top nav with user dropdown + logout
│   ├── FaqCard.tsx       # Card for FAQ list items (markdown stripping)
│   ├── SearchBar.tsx     # Debounced search input (baseRoute prop)
│   ├── CategoryFilter.tsx # Category pills (useSearch-driven, baseRoute prop)
│   ├── QuestionForm.tsx  # Shared question form (mutation injection pattern)
│   ├── SubmitAnswerForm.tsx # Answer submission with error clearing
│   ├── AnswerCard.tsx    # Answer with voting + accept button (colour-coded score)
│   ├── AiSuggestionBanner.tsx # AI match banner (New match / % badge)
│   ├── DocumentStatusCard.tsx # Intent-match document status display
│   ├── WelcomeBanner.tsx # First-time intern welcome (fires PATCH once)
│   ├── ProtectedRoute.tsx # Legacy guard (unused)
│   └── admin/
│       ├── FaqManagerPanel.tsx # Paginated FAQ table + create/edit forms
│       ├── QueryCard.tsx       # Queue item with resolve form + promote modal
│       ├── AnalyticsWidget.tsx # MetricWidget, StatusBar, ContributorRow
│       └── CategoryCoverageCard.tsx # Per-category coverage gap + create FAQ shortcut
├── contexts/
│   └── AuthContext.tsx   # AuthProvider: login/logout/token/user, decodes JWT, hydrates from localStorage
├── hooks/
│   ├── useAuth.ts        # Returns AuthContext value (delegated, no independent /auth/me call)
│   ├── useFaq.ts         # Single FAQ query
│   ├── useFaqs.ts        # Infinite query for FAQ list (maps totalCount → total for pagination)
│   └── useQueryClusters.ts # Admin query insights (category coverage)
├── lib/
│   ├── api.ts            # Axios instance: baseURL from env, JWT interceptor, 401 → /login redirect
│   └── queryClient.ts    # QueryClient: staleTime 2min, retry 1, refetchOnWindowFocus false
├── types/
│   └── index.ts          # All TypeScript interfaces: User, FAQ, Question, Answer, Flag, Category, PaginatedResponse, StatusRecord, StatusResponse, etc.
├── utils/
│   └── roles.ts          # Role helpers: hasRole, isAdminOrAbove, canVote, canAsk, canModerate, canManageSystem
└── services/
    └── auth.ts           # authService: register/login/me (wired; LoginPage uses api directly)
```

---

### Frontend Routes

All routes defined in `src/routes/__root.tsx`. Auth guards are `beforeLoad` hooks (no external library).

| Route | Component | Auth | Status |
|---|---|---|---|
| `/` | → redirects to `/faqs` | — | ✅ |
| `/login` | `LoginPage` | redirect if logged in | ✅ |
| `/signup` | `SignupPage` | redirect if logged in | ✅ |
| `/faqs` | `FaqsPage` | required | ✅ |
| `/faqs/:id` | `FaqDetailPage` | required | ✅ |
| `/ask` | `AskPage` | required | ✅ |
| `/questions` | `QuestionsPage` | required | ✅ |
| `/questions/:id` | `QuestionDetailPage` | required | ✅ |
| `/admin` | `AdminPage` | admin+ | ✅ Layout wrapper with sidebar nav |
| `/admin/queries` | `AdminQueriesPage` | admin+ | ✅ Resolution queue with 30s auto-refresh |
| `/admin/faqs` | `AdminFaqsPage` | admin+ | ✅ FAQ manager + Rebuild AI Index |
| `/admin/analytics` | `AdminAnalyticsPage` | admin+ | ✅ Stats dashboard + Query Insights tab |

**Key patterns used in pages:**
- `useSearch()` from TanStack Router for URL-driven filters (search, category)
- `useMutation` + `queryClient.setQueryData` for optimistic voting on FAQ detail
- `navigate({ routeMask: baseRoute, search: fn })` for filter updates (SearchBar, CategoryFilter)
- SimpleMarkdown renderer (custom, no library) in `FaqDetailPage` for rendering body content

**TanStack Router v1 TypeScript Gotchas:**
- `useSearch({ from: '/faqs' })` and `useNavigate()` type inference is fragile when routes are defined via `createRoute` (not file-based). TypeScript's generic inference on `StrictOrFrom` conditional can produce misleading "does not satisfy constraint RouterCore" errors.
- **Fix pattern:** When `useSearch`/`useNavigate`/`Link` gives hard-to-resolve type errors, cast the opts object `as any` — the runtime behavior is correct. Example:
  ```ts
  // Instead of fighting inference:
  navigate({ routeMask: baseRoute, search: (prev) => ({ ...prev, search: val }) } as any)
  navigate({ to: '/faqs' }) // clean navigate with no search params
  useParams({ from: '/faqs/$id' } as any)
  ```
- `useNavigate()` returns a **generic function** where TypeScript infers each positional arg (`to`, `search`, `params`) independently. `navigate('/path')` (string) fails type-check. Use `navigate({ to: '/path' } as any)` or explicitly typed object.
- `Link` component does NOT support `exact` prop in v1 (removed in v1, was in v0). Use `activeOptions={{ exact: true }}` instead.
- `useMatchRoute()` returns a `matchRoute({ to })` function. No `exact` option — pass `activeOptions` if needed.

---

### TanStack Router — Key Pattern

TanStack Router v1 uses a code-based route tree, NOT file-based routing. Routes are defined as objects in `__root.tsx` and composed into a tree:

```ts
const rootRoute = createRootRoute({ component: () => <>...</> })
const faqsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/faqs', ... })
const routeTree = rootRoute.addChildren([indexRoute, loginRoute, ...])
export const router = createRouter({ routeTree })
```

TanStack Router v1 `useSearch` uses `{ from: '/faqs' }` as a type anchor. Don't confuse with `react-router-dom`'s `useSearchParams`.

Note: `src/routes/{...}` directory exists and appears to be a TanStack Router generated/cache directory — do not place source files there.

---

## Backend

**Stack:** NestJS + Express + Mongoose 8 + MongoDB Atlas + JWT + bcrypt + Swagger (at `/api/docs`)

**Env:** `backend/.env` (not committed — see `.env.example`)

**Dev runner:** `npm run start:dev` inside `backend/`

**Modules (NestJS feature modules):**
- `auth` — JWT login/register/me
- `users` — user management
- `faqs` — FAQ CRUD, voting, feedback
- `questions` — question submission + AI matching (via `AiMatcherService`) + intent detection
- `questions/intent` — `IntentDetectorService` — keyword-based intent detection for internship document/status queries
- `questions/schemas` — `DocumentStatus` schema — per-student, per-document-type status records
- `answers` — answer CRUD
- `categories` — category list
- `flags` — flag/report system
- `admin` — admin analytics + meta
- `ai` — standalone AI service integration
- `seed` — database seeder

**API prefix:** All routes prefixed with `/api` (set in `main.ts`)

---

## Key Types (Frontend `src/types/index.ts`)

```ts
UserRole: 'intern' | 'admin' | 'superadmin'
User: { _id, name, email, role, reputation, createdAt, updatedAt }
FAQ: { _id, title, body, category, tags, status, author, officialAnswer, votes, upvotes, downvotes, viewCount, resolvedBy, createdAt, updatedAt }
Question: { _id, title, body, askedBy, category, tags, status, aiMatchFaqId, aiConfidence, votes, upvotes, downvotes, createdAt, updatedAt }
Answer: { _id, questionId, faqId, body, contributedBy, votes, upvotes, downvotes, isAccepted, isOfficialAdminAnswer, createdAt, updatedAt }
Flag: { _id, reporter, targetId, targetType, reason, status, reviewHistory, createdAt, updatedAt }
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
- AuthContext (JWT storage, decode, server validation, logout)
- Axios interceptor (JWT attach + 401 redirect)
- Role helper utilities
- Vite proxy setup
- Intent detection + DocumentStatus flow (Chunk 11)
- WelcomeBanner + first-time intern PATCH
- Admin resolution queue, FAQ manager, analytics dashboard
- Query Insights tab (category coverage gap)
- CategoryFilter + SearchBar with configurable baseRoute

### ⚠️ Needs Implementation / Verification (Frontend)
- **#21** `useCategories` hook — extract from CategoryFilter (minor refactor)
- **#25** `admin.faqs.tsx` category cell defensive check — same pattern as FaqManagerPanel
- **#22** "Community Member" fallback — mark as won't-fix in FRONTEND_ISSUES.md
- Superadmin pages (not yet implemented)
- Socket.IO real-time vote count updates (Phase 2)
- Flag/report flow (frontend not yet built)

### ⚠️ Backend — Not Yet Audited
- `backend/CHUNK_ISSUES.md` — known backend issues (not yet reviewed this session)
- E2E tests may need `mongodb-memory-server` or live MongoDB fixture

### Implemented (Chunk 11 — Intent Detection)
- `backend/src/questions/intent/intent-detector.service.ts` — `@Injectable()`, `DOCUMENT_STATUS_KEYWORDS` array, `normalise()`, `detect()` → `'document_status_check' | null`
- `backend/src/questions/schemas/document-status.schema.ts` — `DocumentType` + `DocumentStatusValue` enums, compound unique index on `{ studentId, documentType }`
- `backend/src/questions/document-status.service.ts` — `getStatusForStudent(studentId)` → `GetStatusResponse` (union of no-record and document-status shapes), `buildMessage()`, all 4 document types always present
- `backend/src/questions/questions.service.ts` — new `checkIntentAndMatch()` method (intent → AI match → null); existing `create` unchanged
- `backend/src/questions/questions.controller.ts` — POST `/questions` now returns 3 shapes: `{ questionId }` (save), `{ aiMatch: true, faq }` (AI match), `{ intentMatch: true, intentType, statusResponse }` (intent)
- `backend/src/questions/questions.module.ts` — `DocumentStatusSchema` registered, `IntentDetectorService` + `DocumentStatusService` in providers, both exported
- `frontend/src/routes/ask.tsx` — owns `useMutation`, handles intent/AI-match/save dispatch; `DocumentStatusCard` shown when `intentMatch` fires
- `frontend/src/components/QuestionForm.tsx` — accepts optional `mutation` prop; uses injected mutation if provided
- `frontend/src/components/DocumentStatusCard.tsx` — green/amber/red banner, progress bar, fixed sort order, status badges, rejection reason box
- `seed-document-status.js` — project root, upserts 4 test records for a given student email

### Testing
- E2E tests live in `backend/test/` and run via `npm run test:e2e`
- Config: `backend/test/jest-e2e.json`
- Tests: `auth.e2e-spec.ts`, `questions.e2e-spec.ts`, `voting.e2e-spec.ts`, `admin.e2e-spec.ts`
- Use `seed-document-status.js` to prime `documentstatuses` collection before testing intent flow:
  1. Set `STUDENT_EMAIL` at top of script
  2. `node seed-document-status.js` from project root
  3. Log in as that student and submit a question matching NOC/offer letter keywords

---

## Design Notes

- **Auth:** JWT stored in `localStorage`. `AuthContext` decodes it client-side on load and re-validates with `GET /auth/me`. 401 responses auto-redirect to `/login`.
- **No auth library:** Auth guards are plain functions in `__root.tsx` that check `localStorage` and `throw redirect()`.
- **No Zustand/Redux:** Server state managed entirely via TanStack Query. Component-local state for UI (dropdowns, toasts, etc.).
- **Styling:** Pure Tailwind — no CSS modules, no component library. Indigo primary color.
- **Markdown:** Custom `SimpleMarkdown` component in `FaqDetailPage` — lightweight, no external lib. Only handles: headings, bold, italic, inline code, links, blockquotes, lists, code blocks.
- **Admin routes use nested layout pattern:** `adminLayoutRoute` wraps `/admin` with a sidebar `Outlet`. Child routes (`queries`, `faqs`, `analytics`) are nested via `getParentRoute: () => adminLayoutRoute` — no URL prefix conflict.
- **Intent detection flow:** `POST /questions` → `QuestionsService.checkIntentAndMatch()` → `IntentDetectorService.detect()` (keyword match on normalised title+body) → `DocumentStatusService.getStatusForStudent()` if matched. No MongoDB save, no AI call when intent fires. Frontend shows `DocumentStatusCard` instead of form.
- **Global exception filter:** `src/common/http-exception.filter.ts` — catches `HttpException` for formatted `{ statusCode, message, timestamp, path }` responses and maps all other exceptions to 500 `{ statusCode: 500, message: 'Internal server error' }` without leaking internal details. Registered globally in `main.ts`.
- **TanStack Query client:** `frontend/src/lib/queryClient.ts` — `QueryClient` with `staleTime: 1000 * 60 * 2`, `retry: 1`, `refetchOnWindowFocus: false`. Imported and used in `main.tsx` as the `QueryClientProvider` client.
- **AuthContext `_id` field:** Decoded from JWT's `userId` claim (MongoDB ObjectId string), confirmed against `/auth/me` response. All user comparisons use `_id` — never the JWT UUID directly.
- **Vote score colour coding:** `AnswerCard` renders vote score in green (positive), red (negative), grey (zero).
- **Markdown stripping:** `FaqCard.stripMarkdown()` handles fenced code blocks, inline code, images, links (→ text only), headings, bold/italic/strikethrough, lists/blockquotes, leftover brackets.

---

## Related Files

- `memory/2026-06-01.md` — current session memory
- `memory/FRONTEND_AUDIT_2026-06-01.md` — detailed audit log (2026-06-01)
- `FRONTEND_ISSUES.md` — original 25-issue list (2026-05-29)
- `backend/CHUNK_ISSUES.md` — known backend issues (pending audit)
- `frontend/src/routes/__root.tsx` — definitive route + guard definitions
- `frontend/src/types/index.ts` — all domain types
- `frontend/src/contexts/AuthContext.tsx` — auth state management