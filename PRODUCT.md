# CrowdFAQ

**A living FAQ platform for student communities — where the crowd answers, AI assists, and admins step in last.**

> Built for Vicharanashala Summership · Team 11

---

## The Problem

Every cohort, the same 10 questions recycle through chat: *"Where's my offer letter?" "Has my NOC been approved?" "When does onboarding start?"* They're scattered across threads, unanswered, or answered repeatedly by admins who already have real work to do.

CrowdFAQ breaks that loop.

---

## What Is CrowdFAQ

A community-driven FAQ platform with three-tier intelligence:

1. **Intent Detection (instant)** — keyword match for document queries (NOC, offer letter, onboarding). Returns a live status card with progress bar, current state, and rejection reason. No queue, no AI call, zero latency.

2. **Semantic Matching (fast)** — questions that aren't document queries get embedded and compared against the FAQ index via cosine similarity. A confident match (≥ 0.75) surfaces the answer immediately with an AI suggestion banner.

3. **Community Queue (when needed)** — questions that stump both layers go to the crowd. Interns answer, vote, and resolve. Admins handle only what genuinely needs them.

**Fewer redundant questions. Faster answers. Admins freed for problems that actually matter.**

---

## What Makes This Stand Out

<<<<<<< HEAD
### 🤖 AI Pipeline
We included a MERN-native Ollama + cosine similarity pipeline for student intent detection and FAQ matching.

Two embedding providers, switchable via env var:
- **Ollama** (`nomic-embed-text`) — fully local, zero API cost
- **Hugging Face Inference API** — cloud-ready, 1,000 req/day quota

If either provider goes down, questions proceed normally. **No student is ever blocked.**
=======
### 🤖 Native AI Pipeline — No Python Microservice
Most student projects bolt on AI as an afterthought with a separate Python service to deploy. CrowdFAQ keeps it MERN-native: embeddings via **Ollama** (`nomic-embed-text`) with application-level cosine similarity, running entirely within the NestJS backend. If Ollama goes down, the platform degrades gracefully — questions still save, no student is ever blocked.
>>>>>>> ef0927e (fixes and feats)

### ⚡ Intent Detection Before AI
For document-status queries, CrowdFAQ skips the embedding model entirely. A keyword match fires first and returns a live `DocumentStatusCard` — progress bar, current state, rejection reason. Instant. Zero latency.

### 🧪 Actually Tested
28 E2E tests, 28 passing. Auth, voting, questions, and admin flows — backed by `mongodb-memory-server` so tests are isolated and reproducible. The frontend ships with zero TypeScript errors (25 issues identified and resolved).

### 📊 Query Insights for Admins
The admin dashboard surfaces per-category coverage gaps — questions with no matching FAQ. One click opens the FAQ creation form prefilled for that category. The knowledge base improves itself.

---

## Core Features

| Feature | What It Does |
|---------|-------------|
| **Auth & Roles** 🔐 | JWT login/register, role-based guards (intern / admin / superadmin), first-time WelcomeBanner |
| **FAQ Knowledge Base** 📚 | Paginated browse, category filters, debounced search, admin create/edit/archive |
| **Intent Detection** ⚡ | Document status (NOC, offer letter, onboarding) without touching the queue or calling AI |
| **AI Matching** 🤖 | Ollama embeddings + cosine similarity; graceful degradation if embedding service is down |
| **Community Q&A** 🙋 | Ask, answer, upvote/downvote, accept; official admin answers; accepted answer pinned |
| **Moderation** 🚩 | Flag/report flow (FlagButton + FlagModal); admin review queue (pending / reviewed / dismissed / resolved) |
| **Admin Dashboard** 📊 | Resolution queue (30s auto-refresh), FAQ manager, analytics, Query Insights |

---

## Question Lifecycle

```
Student submits question
        │
        ▼
Intent detection — keyword match on title + body
        │
   Match? ──yes──▶ Return DocumentStatusCard (no DB write, no AI call)
        │
        no
        ▼
Embed question → cosine similarity vs FAQ index
        │
   Match ≥ 0.75? ──yes──▶ Show AI suggestion banner with matched FAQ
        │
        no
        ▼
Save question → Community queue
        │
        ▼
Community answers + votes
        │
   Resolved? ──yes──▶ Done
        │
        no
        ▼
Admin resolves or promotes to FAQ ← last resort, not first response
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, TanStack Router v1, TanStack Query v5, Tailwind CSS v3 |
| Backend | NestJS, Mongoose 8, MongoDB Atlas |
| AI / Embeddings | Ollama (`nomic-embed-text`) with application-level cosine similarity |
| Testing | Jest + `mongodb-memory-server` — 28/28 E2E tests passing |
| Auth | JWT, role-based guards, Axios 401 interceptor |

---

## Build Quality

| Area | Status |
|------|--------|
| Frontend TypeScript | ✅ Zero errors — 25/25 issues resolved |
| Backend TypeScript | ✅ Clean |
| Intent detection | ✅ Live — fires before AI match |
| AI matching (Ollama) | ✅ Live — degrades gracefully if offline |
| E2E test suite | ✅ 28/28 passing |
| Flag & moderation | ✅ Complete end-to-end |
| Query Insights | ✅ Built — coverage gaps surfaced per category |
| Admin analytics | ✅ Overview tab + AI index staleness warning |
| Superadmin pages | 🔜 Not built |
| Real-time vote updates | 🔜 Socket.IO — Phase 2 |

---

## Roadmap

| Feature | Status |
|---------|--------|
| Socket.IO live vote counts | 🔜 Phase 2 |
| Duplicate detection | 🔜 Uses stored `questionEmbedding` vectors |
| FAQ auto-promotion | 🔜 High-resolution questions → admin FAQ candidates |

---

<<<<<<< HEAD
*Team 11 · Vicharanashala Summership · 11 members*
=======
*CrowdFAQ is maintained by Team 11 — 11 members of the Vicharanashala Summership cohort.*
>>>>>>> ef0927e (fixes and feats)
