# Phase 2 & Not-Yet-Built Checklist

> Compiled 2026-06-03. Update this file as items are completed.

---

## ⚠️ Partial — Backend Done, Frontend Not Wired Up

### 1. Voting on Questions ✅ Frontend wired up (2026-06-03)
- **Backend:** `POST /questions/:id/vote` — toggle/flip/add, self-vote prevented
- **Frontend:** Vote buttons added to `QuestionDetailPage` meta row (`questions.$id.tsx`)
  - Inline arrows next to "Asked by {author}" in the question card meta
  - Colour-coded score (green positive, red negative, grey zero)
  - Disabled when user is the question author
  - `onSettled` invalidates `['question', id]` query
- **See:** `FUTURE_FEATURES.md` — option to add voting to the questions list as well

---

## ✅ Recently Completed (2026-06-04)

### 2. `aiMatchFaqId` Not Saved on Question Create — Fixed
- **Problem:** Shape 2 (AI match): controller returned `{ aiMatch, faq }` without persisting the question — matched FAQ ID was discarded. Shape 1/forceSubmit: referenced undefined `matchedFaqId` variable → `ReferenceError`.
- **Impact:** `aiMatchRate` in analytics always undercounted.
- **Fix (2026-06-04):** `questions.controller.ts` — Shape 2 now captures `intentOrMatch.faq.id` and calls `create(dto, userId, capturedFaqId)`; Shape 1/forceSubmit simplified (no undefined var). `ask.tsx` — `onSuccess` captures `payload` (2nd arg) so reject → force-submit posts the correct form data.
- **Files:** `backend/src/questions/questions.controller.ts`, `frontend/src/routes/ask.tsx`

### 3. `rebuild-index` AI Endpoint — ✅ Native NestJS (2026-06-04)
- **Backend:** `AdminService.rebuildIndex()` calls `FaqEmbeddingsService.rebuildAll()` natively — no Python microservice involved.
- **Result:** `Meta.lastIndexRebuild` updated on success; left untouched on failure (staleness surfaces in dashboard).
- **Files:** `backend/src/ai/faq-embeddings.service.ts`, `backend/src/admin/admin.service.ts`

### 4. Superadmin Pages
- **Backend:** `canManageSystem(role)` guard exists (`roles.ts`), `isSuperadmin(role)` helper exists.
- **Frontend:** No dedicated superadmin UI. Route guard not yet enforcing superadmin-only routes.
- **Action:** Design and build superadmin-specific pages (e.g., user management, system-wide config).

---

## ❌ Not Yet Built

### 5. Flag / Report Flow
- **Backend:** `flags` module exists — `Flag` schema, `FlagsService`, `FlagsController`, plus `comment` field (added 2026-06-03).
- **Frontend:** `FlagModal` + `FlagButton` built. Added to `AnswerCard` (icon) and `FaqDetailPage` (icon). `AdminFlagsPage` at `/admin/flags` with status tabs and review/dismiss/resolve actions.
- **Route:** `/admin/flags` — added to admin sidebar + route tree.
- **Status:** ✅ Done 2026-06-03

### 6. Socket.IO Real-Time Updates
- **Status:** ✅ Built 2026-06-15 — Backend: `EventsGateway` + `EventsModule`; Frontend: `useSocket` hook + 4 route files wired.
- Backend: `EventsGateway` (`backend/src/events/events.gateway.ts`) emits 4 events — `vote:updated`, `answer:created`, `question:statusChanged`, `faq:published`. Injected into `FaqsService`, `AnswersService`, `QuestionsService`.
- Frontend: `useSocket` hook (`frontend/src/hooks/useSocket.ts`) with global shared singleton socket; `questions.$id.tsx` (vote + answer + status), `faqs.$id.tsx` (vote), `admin.queries.tsx` (status → invalidate, 30s interval removed), `faqs.tsx` (faq:published → invalidate).
- Socket.IO packages installed: `backend: @nestjs/platform-socket.io @nestjs/websockets socket.io`; `frontend: socket.io-client`.
- Backend TypeScript ✅ `tsc --noEmit` exit 0; Frontend TypeScript ✅ `tsc --noEmit` exit 0; E2E: 27/28 (1 pre-existing failure in `rebuild-index` test unrelated to Socket.IO).
- **Strict constraints honoured:** `AuthContext`, `api.ts`, `queryClient.ts`, `__root.tsx`, `main.ts`, all test files untouched.

### 7. E2E Tests — ✅ Done (2026-06-04)
- **Backend tests:** Live in `backend/test/` (`auth.e2e-spec.ts`, `questions.e2e-spec.ts`, `voting.e2e-spec.ts`, `admin.e2e-spec.ts`). Run via `npm run test:e2e`.
- **Setup:** `TestDatabase` class in `test/setup-test-db.ts` using `mongodb-memory-server`. `beforeAll` connects before `Test.createTestingModule`, `afterAll` closes.
- **Timeout:** `testTimeout: 60000` in `jest-e2e.json` (5s default too short for MongoDB binary download).
- **Key fixes applied:**
  - `question.schema.ts`: `category` made optional (DTO validation optional, Mongoose schema `required: true` was blocking saves)
  - `auth.service.ts`: `name` added to JWT payload → `/auth/me` returns `{ userId, name, email, role }`
  - `http-exception.filter.ts`: `CastError` (Mongoose invalid ObjectId) now returns 404 instead of 500
  - Test assertions corrected: `contributedBy: expect.any(String)` (Mongoose raw serialization), accept-answer re-fetches after PATCH, resolved questions still accept answers (only `closed` rejects), vote flip sequence uses `added` not `changed`
- **Result:** 28/28 tests pass

### 8. Reputation System
- **Status:** ✅ Built 2026-06-15 — `ReputationService` + `ReputationEvent` schema + history endpoint + `/reputation` page + Navbar badge.
- Backend: `ReputationService` centralises all reputation mutations with floor-at-0 clamping. 6 events wired: `answer_upvoted` (+10), `answer_downvoted` (-2), `answer_downvote_reversed` (-5 on upvote removal), `answer_accepted` (+15), `question_answered` (+2), `faq_contributed` (+25). Direct `User.reputation` mutations in `AnswersService.vote()` replaced by `ReputationService.award()` calls.
- Frontend: `useReputation` hook, `/reputation` page (score + earning guide + paginated history), Navbar dropdown reputation badge for interns.
- `GET /users/me/reputation` endpoint added to `UsersController`.
- TypeScript ✅ `tsc --noEmit` exit 0 (both packages); E2E: 27/28 (1 pre-existing failure unrelated to this work).

---

## Recently Completed (2026-06-03)

- [x] `QuestionsService.vote()` + `POST /questions/:id/vote` endpoint (backend)
- [x] `aiMatchFaqId` ownership check in `AnswersService.vote()`
- [x] Duplicate `promote-faq` route removed from `AnswersController`
- [x] `forceSubmit` query param typed correctly (`boolean` not `string`)
- [x] Issue #25 category `[object Object]` in admin FAQ manager (pre-resolved)

## Recently Completed (2026-06-04)

- [x] Item #2 — `aiMatchFaqId` now saved on question create (`questions.controller.ts` Shape 2 captures `intentOrMatch.faq.id` and passes to `create()`; Shape 1/forceSubmit fixed; `ask.tsx` `pendingPayload` fix for reject flow)
- [x] **HuggingFace provider extracted** (2026-06-15) — moved from inline class in `embeddings.service.ts` to `backend/src/ai/providers/huggingface.provider.ts`. Uses native `fetch`, 30s timeout, 384-dim shape validation, `wait_for_model: true`, fail-fast on missing API key. Env var renamed: `HUGGINGFACE_MODEL` → `HUGGINGFACE_EMBEDDING_MODEL`. `EMBEDDING_PROVIDER=huggingface` now defaults in `.env.example`.
- [x] **Bug 6 fix** (2026-06-15) — `AuthContext` now exposes both `_id` and `id` (alias) on the `AuthUser` object. `decodeJwt()`, `useEffect` hydration, and `login()` all set both fields from the same source value. Consumers using either `user._id` or `user.id` now work correctly.
- [x] **Bug 8 fix** (2026-06-15) — `QueryCard` status badge now handles all 4 statuses: `open` (blue), `in_progress` (yellow), `resolved` (green), `closed` (gray). Previously `in_progress` and `closed` were unstyled, and `resolved` showed the same yellow as `open`.
- [x] **Bugs 11 & 12 fix** (2026-06-15) — `SubmitAnswerForm` and `QuestionForm` now call `mutation.reset()` on input change, clearing stale error messages when users edit after a failed submission.
- [x] **Bug 13 fix** (2026-06-15) — `FaqCard` truncation check now uses `stripMarkdown(faq.body).length > 120` instead of `faq.body.length > 120` — `…` only appears when the stripped text genuinely exceeds 120 chars.
- [x] **Socket.IO Phase 2** (2026-06-15) — `useSocket` hook + 4 routes; 30s admin queue polling interval removed; all 4 real-time events wired
- [x] **Reputation System** (2026-06-15) — `ReputationService` + `ReputationEvent` schema + 6 earning events wired + `GET /users/me/reputation` endpoint + `/reputation` page + Navbar reputation badge for interns