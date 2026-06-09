# CrowdFAQ

> Built for Vicharanashala Summership · Team 11

---

## The Problem

Every internship cohort, admins face the same 10 questions on loop — *"Where's my offer letter?" "Has my NOC been approved?" "When does onboarding start?"* — buried across chat threads, with no single source of truth. New students don't know where to look. Admins burn time answering things that were answered last cohort, and the cohort before that.

CrowdFAQ breaks the cycle.

---

## What We Built

A community-driven FAQ platform where **students self-serve, AI intercepts, and admins only handle what truly needs them.**

The flow is simple: a student asks a question. Before it ever reaches a human, CrowdFAQ runs it through two layers of intelligence —

1. **Intent detection** — if it's a known document query (NOC, offer letter, onboarding), the platform returns a live status card instantly. No queue. No AI call. No wait.
2. **Semantic matching** — if it's not a document query, the question is embedded and compared against the entire FAQ index using cosine similarity. A confident match (≥ 0.75) surfaces the answer immediately with an AI suggestion banner.

Only questions that genuinely stump both layers reach the community queue — where interns answer, vote, and collectively resolve. Admins step in last, with a structured queue, auto-refresh, and one-click FAQ promotion.

**The result:** fewer redundant questions, faster answers, and admins who can focus on problems that actually need them.

---

## What Makes This Stand Out

### 🤖 Production-Grade AI Pipeline — No Python Microservice
Most student projects bolt on AI as an afterthought. We replaced an entire Python FAISS microservice with a **MERN-native Ollama + cosine similarity pipeline** — same stack, no extra service to deploy or maintain.

Two embedding providers, switchable via env var:
- **Ollama** (`nomic-embed-text`) — fully local, zero API cost
- **Hugging Face Inference API** — cloud-ready, 1,000 req/day quota

If either provider goes down, questions proceed normally. **No student is ever blocked.**

### ⚡ Intent Detection Before AI
For the most common student queries — document statuses — we don't even call the embedding model. A keyword match fires first and returns a live `DocumentStatusCard` with progress bar, current state, and rejection reason. Instant. Zero latency.

### 🧪 Actually Tested
28 E2E tests. 28 passing. Across auth, voting, questions, and admin flows — backed by `mongodb-memory-server` so tests are isolated and reproducible. Frontend ships with zero TypeScript errors (25 issues identified and resolved).

### 🔍 Query Insights for Admins
The admin dashboard includes a **Query Insights tab** that surfaces per-category coverage gaps — questions that keep coming in without a matching FAQ. One click creates the FAQ. The knowledge base improves itself.

---

## Core Features

| Feature | What It Does |
|---------|-------------|
| 🔐 **Auth & Roles** | JWT auth, role-based guards (`intern` / `admin` / `superadmin`), first-time WelcomeBanner |
| 📚 **FAQ Knowledge Base** | Search + category filters + infinite scroll; admin create/edit/archive |
| 🤖 **AI Matching** | Ollama + Hugging Face embeddings; cosine similarity; graceful degradation |
| ⚡ **Intent Detection** | Instant document status (NOC, offer letter, onboarding) — no queue, no AI |
| 🙋 **Community Q&A** | Ask, answer, upvote/downvote, accept; official admin answers |
| 🚩 **Moderation** | Flag flow with admin review queue (pending / reviewed / dismissed / resolved) |
| 📊 **Admin Dashboard** | Resolution queue, analytics, Query Insights tab, 30s auto-refresh |

---

## Question Lifecycle

```
Student submits question
        │
        ▼
Intent detection (keyword match)
        │
   Match? ──yes──▶ Return DocumentStatusCard  ← instant, no DB write, no AI
        │
        no
        ▼
AI embedding + cosine similarity vs FAQ index
        │
   Match ≥ 0.75? ──yes──▶ Show AiSuggestionBanner + FAQ  ← resolved in seconds
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
Admin resolves / promotes to FAQ  ← last resort, not first response
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, TanStack Router v1, TanStack Query v5, Tailwind CSS v3 |
| Backend | NestJS, MongoDB |
| AI / Embeddings | Ollama (`nomic-embed-text`), Hugging Face Inference API |
| Testing | Jest + `mongodb-memory-server` — 28/28 E2E tests passing |
| Auth | JWT, role-based guards, Axios interceptor |

---

## Build Quality

| Area | Status |
|------|--------|
| Frontend TypeScript | ✅ Zero errors — 25/25 issues resolved |
| Backend TypeScript | ✅ Clean |
| AI matching (Ollama) | ✅ Phase 1–3 complete |
| Hugging Face integration | ✅ Live (1,000 req/day) |
| E2E test suite | ✅ 28/28 passing |
| Flag & moderation | ✅ Complete |
| Superadmin pages | 🔜 Coming next |
| Real-time vote updates | 🔜 Socket.IO — Phase 2 |

---

## Roadmap

- **Superadmin** — platform-level community and user management
- **Real-time updates** — Socket.IO live vote counts
- **Duplicate detection** — `questionEmbedding` vectors already stored; similarity check before submission is the next step
- **FAQ auto-promotion** — surface high-resolution questions to admins as FAQ candidates automatically

---

*Team 11 · Vicharanashala Summership · 11 members*