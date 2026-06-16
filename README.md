# CrowdFAQ -- Team 11

> Vicharanashala Summership . CrowdSourced FAQ Platform

---

## Team

| Role | Name | GitHub |
|------|------|--------|
| **Team Lead** | Amirth Sadhakshi M | [sadhami0519](https://github.com/sadhami0519) |
| **Member** | Abhijith B | [Abhijith2005binu](https://github.com/Abhijith2005binu) |
| **Member** | Aditya Raghuvanshi | [aditya12-here](https://github.com/aditya12-here) |
| **Member** | Chirag Saxena | [Laplaciann](https://github.com/Laplaciann) |
| **Member** | Draksharam Rushali | [Rushali0312](https://github.com/Rushali0312) |
| **Member** | Khushi Dosi | [Khushidosi13](https://github.com/Khushidosi13) |
| **Member** | Kiran Belsare | [KiranBelsare](https://github.com/KiranBelsare) |
| **Member** | Lakshmi Sahasra M | [sahasraa09](https://github.com/sahasraa09) |
| **Member** | Sukrish | [sukrish3637d](https://github.com/sukrish3637d) |
| **Member** | Vetcha Venkata Sai Pavan | [SaiPavanVetcha](https://github.com/SaiPavanVetcha) |

<<<<<<< HEAD
> **Team No.** 10 &nbsp;·&nbsp; **Team Count** 10
=======
> **Team No.** 11  |  **Team Count** 11
>>>>>>> ef0927e (fixes and feats)

---

## Quick Orientation

> Last updated: 2026-06-15 20:04 GMT+5:30 -- HuggingFace provider refactored (native fetch, shape validation, fail-fast); Bug 6/8/11/12/13 fixed in frontend.

| File | Purpose |
|------|---------|
| `manual_checklist.md` | Setup steps (HuggingFace or Ollama, env vars, rebuild-index) |
| `CURRENT_FEATURES.md` | Complete inventory of what works right now |
| `PHASE2_CHECKLIST.md` | Pending items |
| `FUTURE_FEATURES.md` | Ideas and enhancements for later |
| `memory/` | Daily session logs |
| `FRONTEND_ISSUES.md` | Issue list with fix status (25 issues; most resolved) |
| `backend/CHUNK_ISSUES.md` | Backend known issues log |

---

## Project Overview

**CrowdFAQ** is a community-driven FAQ platform for student communities. Students ask questions, the community answers and votes, AI matches incoming questions to existing FAQs, and admins step in last.

Two repositories in one monorepo:
- `frontend/` -- React 18 + Vite SPA
- `backend/` -- NestJS + MongoDB API

---

## Repository Structure

```
faq-query-resolution-system/
|-- frontend/           # React SPA
|-- backend/            # NestJS API
|-- memory/             # Session memory and audit logs
|-- manual_checklist.md # Manual setup steps (HuggingFace or Ollama, env, rebuild-index)
|-- CURRENT_FEATURES.md # Complete inventory of live features
|-- PHASE2_CHECKLIST.md # Pending items
|-- FUTURE_FEATURES.md  # Ideas and enhancements for later
|-- CONTEXT.md          # Project context for AI sessions
|-- FRONTEND_ISSUES.md  # Issue list with fix status
|-- backend/CHUNK_ISSUES.md # Backend known issues log
|-- seed-document-status.js
```

---

## Tech Stack

### Frontend
- React 18 + Vite 6 (dev: `npm run dev` -> port 5173)
- TanStack Router v1 (code-based type-safe routing)
- TanStack Query v5 (server state, infinite pagination, optimistic updates)
- Tailwind CSS v3
- Axios (HTTP client)

**Env:** Copy `.env.example` to `.env` and set `VITE_API_URL` (default: `http://localhost:3000/api`).

### Backend
- NestJS + Mongoose 8 + MongoDB Atlas
- Ollama vector search (MERN-native, replaces Python FAISS)
- **HuggingFace Inference API** -- free tier ~1,000 req/day; `EMBEDDING_PROVIDER=huggingface`; set `HUGGINGFACE_API_KEY` in backend `.env`
- `EMBEDDING_PROVIDER=huggingface` (cloud, default) | `ollama` (local) | `mock` (dev/test)
- `HUGGINGFACE_EMBEDDING_MODEL` (default: `sentence-transformers/all-MiniLM-L6-v2`)
- `OLLAMA_URL`, `OLLAMA_EMBEDDING_MODEL` env vars (only when `EMBEDDING_PROVIDER=ollama`)
- `AI_CONFIDENCE_THRESHOLD=0.75` -- minimum cosine similarity for a valid AI match

---

## Current State (as of 2026-06-15)

### Frontend -- Audit Complete
TypeScript clean: `npx tsc --noEmit` passes with zero errors (25/25 `FRONTEND_ISSUES` resolved; Bugs 6/8/11/12/13 fixed 2026-06-15).

### Backend -- TypeScript Clean
Ollama Vector Search (Phase 1+2+3) done:
- Python FAISS microservice replaced with MERN-native embedding pipeline
- `FaqEmbedding` schema, `EmbeddingsService` (HuggingFace + Ollama + Mock providers), `FaqEmbeddingsService`, `AiMatcherService` all rewritten
- `HuggingFaceProvider` extracted to `backend/src/ai/providers/huggingface.provider.ts` (2026-06-15) -- native fetch, 30s timeout, 384-dim shape validation, `wait_for_model: true`, fail-fast on missing API key
- FAQ `create/update/archive` auto-index embeddings (fire-and-forget)
- `QuestionsService.create()` embeds question title+body for future duplicate-detection
- **E2E Tests:** 28/28 passing across 4 spec files (`auth`, `voting`, `questions`, `admin`)

---

## Features

### Auth & Users
> **JWT-based authentication** with client-side decode, server validation, and auto-redirect on expiry.
- Login + Signup with full form validation
- Role-based access: `intern` / `admin` / `superadmin`
- `AuthContext` persists session via `localStorage`; Axios interceptor attaches JWT to every request
- Exposes both `_id` and `id` (alias) on the user object -- both are the MongoDB ObjectId string
- First-time intern **WelcomeBanner** (fires a one-time PATCH on first login)

### FAQ System
> **The core knowledge base** -- browsable, searchable, and community-powered.
- Browse FAQs with **debounced search**, **category filter pills**, and **infinite scroll**
- FAQ detail page with **upvote/downvote**, feedback, and lightweight markdown rendering
- Admins can create, edit, archive FAQs and trigger **AI index rebuild**

### AI Matching
> **Semantic search** that routes questions to existing FAQs before they hit the queue -- powered by Ollama locally or HuggingFace in the cloud.
- `HuggingFaceProvider` (cloud, default) -- native `fetch`, 30s timeout, 384-dim shape validation, `wait_for_model: true`; fail-fast if `HUGGINGFACE_API_KEY` missing
- `OllamaProvider` (local) -- for teams running Ollama on-premises
- `MockProvider` (dev/test) -- deterministic pseudo-embeddings, no external deps
- 384-dim float vectors stored in `faq_embeddings` collection
- Brute-force cosine similarity with configurable confidence threshold (`AI_CONFIDENCE_THRESHOLD=0.75`)
- Graceful degradation: if the embedding provider fails, `findBestMatch()` returns `null` -- questions save without AI match, **no user is ever blocked**
- `AiSuggestionBanner` surfaces the match with a confidence badge on the Ask page

### Intent Detection
> **Instant answers** for common document-status queries -- no queue, no wait.
- Keyword match on question title+body detects `document_status_check` intent
- Returns live status for NOC, offer letter download, offer letter acceptance, internship beginning
- `DocumentStatusCard` shows green/amber/red status, progress bar, and rejection reason -- **without saving a question or calling AI**

### Questions & Answers
> **Community-driven resolution** with voting, acceptance, and admin escalation.
- Students submit questions; community posts answers
- Upvote/downvote on answers; colour-coded score (green / grey / red)
- Answer acceptance flow; official admin answer flag
- Admin resolution queue with **30-second auto-refresh**; all 4 statuses colour-coded (open=blue, in_progress=yellow, resolved=green, closed=gray)

### Flag & Moderation
> **Keep the platform clean** -- users flag, admins review.
- `FlagButton` on FAQ detail and answer cards
- `FlagModal` with reason dropdown + optional comment
- `/admin/flags` review page with tabs: pending / reviewed / dismissed / resolved

### Admin Dashboard
> **Full visibility** into platform health and community contribution.
- Resolution queue, FAQ manager, analytics dashboard
- **Query Insights tab** -- per-category coverage gap + one-click "Create FAQ" shortcut
- `ContributorRow`, `MetricWidget`, `StatusBar` analytics components

---

## Pending

- Superadmin pages (not yet implemented)
- Socket.IO real-time vote count updates (Phase 2)
- Full reputation system
- `backend/CHUNK_ISSUES.md` -- backend issues not yet audited

---

## Testing

E2E tests live in `backend/test/` -- run via `npm run test:e2e` from `backend/`.

To test intent detection flow:
1. Set `STUDENT_EMAIL` at top of `seed-document-status.js`
2. Run `node seed-document-status.js` from project root
3. Log in as that student and submit a question matching NOC/offer letter keywords

---

## Key Design Notes

- **Auth:** JWT in `localStorage`; `AuthContext` decodes client-side and re-validates with `GET /auth/me`. 401s auto-redirect to `/login`. Exposes both `_id` and `id` (alias) on the user object -- both are the MongoDB ObjectId string, set from either JWT claim or `/auth/me` response.
- **No Zustand/Redux:** Server state managed entirely via TanStack Query.
<<<<<<< HEAD
- **Styling:** Pure Tailwind — no CSS modules, no component library. Indigo primary color.
- **Ollama graceful degradation:** If Ollama is offline, `findBestMatch()` returns `null` — user is never blocked.
- **Intent detection:** `POST /questions` → keyword match → `DocumentStatusService` if matched. No DB save, no AI call when intent fires.
- **Global exception filter:** Formats all errors as `{ statusCode, message, timestamp, path }`; maps unknown exceptions to 500 without leaking internals.
=======
- **Styling:** Pure Tailwind -- no CSS modules, no component library. Indigo primary color.
- **AI graceful degradation:** If the embedding provider is unavailable, `findBestMatch()` returns `null` -- user is never blocked.
- **Intent detection:** `POST /questions` -> keyword match -> `DocumentStatusService` if matched. No DB save, no AI call when intent fires.
- **Global exception filter:** Formats all errors as `{ statusCode, message, timestamp, path }`; maps unknown exceptions to 500 without leaking internals.
>>>>>>> ef0927e (fixes and feats)
