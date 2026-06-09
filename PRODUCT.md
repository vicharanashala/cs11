# CrowdFAQ — Product Document

> A community-driven FAQ platform built for student internship communities.

---

## 🧩 What Is CrowdFAQ?

CrowdFAQ is a platform that helps student communities self-serve answers to common questions — reducing repetitive queries to admins and surfacing the right information fast.

Students ask questions. The community answers and votes. AI quietly routes known questions to existing FAQs before they ever reach the queue. Admins only step in when the community can't resolve something.

---

## 🎯 Problem Statement

Student internship communities are flooded with the same questions every cohort — document statuses, deadlines, processes. Admins are overwhelmed. New students don't know where to look. Answers get buried in chat threads.

CrowdFAQ solves this by:
- Building a **searchable, community-maintained knowledge base** (FAQs)
- Using **AI to match new questions to existing answers** before anyone has to type a reply
- Giving admins a **structured queue** so nothing falls through the cracks

---

## 👤 Users

| Role | Description |
|------|-------------|
| **Intern** | Asks questions, browses FAQs, votes on answers, submits answers |
| **Admin** | Manages FAQs, resolves questions, reviews flags, views analytics |
| **Superadmin** | Platform-level management *(coming soon)* |

---

## 🚀 Core Features

### 1. FAQ Knowledge Base
A searchable, categorised library of curated answers. Interns browse with search and category filters. Admins create, edit, and archive entries. The knowledge base grows over time as questions get promoted to FAQs.

### 2. AI-Powered Question Matching
When a student submits a question, the platform embeds it and computes cosine similarity against all published FAQs. If confidence exceeds the threshold (0.75), the student is shown the matching FAQ immediately — **no queue entry created, no admin needed**.

Powered by:
- **Ollama** (`nomic-embed-text`) for local/on-prem deployments
- **Hugging Face Inference API** for cloud deployments (1,000 req/day quota)

Graceful degradation: if the embedding provider is unavailable, questions proceed normally. No student is ever blocked.

### 3. Intent Detection — Instant Document Status
Students frequently ask about NOC, offer letters, and onboarding documents. CrowdFAQ detects these queries by keyword and returns a **live document status card** — no queue, no wait, no AI call.

Statuses tracked: `NOC` · `Offer Letter Download` · `Offer Letter Acceptance` · `Internship Beginning`

Each status shows: current state, progress bar, and rejection reason (if applicable).

### 4. Community Q&A
Questions that don't match an existing FAQ go to the community queue. Any intern can post an answer. Answers are upvoted/downvoted with colour-coded scores. The asker can accept the best answer. Admins can post official answers and escalate to a new FAQ.

### 5. Moderation & Flagging
Users flag inappropriate FAQs or answers. Admins review flags in a dedicated page with status tabs (pending / reviewed / dismissed / resolved).

### 6. Admin Dashboard
Admins get full visibility: resolution queue (30s auto-refresh), FAQ manager, analytics widgets, and a **Query Insights tab** that shows per-category coverage gaps and lets admins create missing FAQs in one click.

---

## 🔄 Question Lifecycle

```
Student submits question
        │
        ▼
Intent detection (keyword match)
        │
   Match? ──yes──▶ Return DocumentStatusCard (no save, no AI)
        │
        no
        ▼
AI embedding + cosine similarity vs FAQ index
        │
   Match ≥ 0.75? ──yes──▶ Show AiSuggestionBanner + FAQ
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
Admin resolves / promotes to FAQ
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, TanStack Router v1, TanStack Query v5, Tailwind CSS v3 |
| Backend | NestJS, MongoDB |
| AI / Embeddings | Ollama (`nomic-embed-text`), Hugging Face Inference API |
| Testing | Jest, `mongodb-memory-server` (28/28 E2E tests passing) |
| Auth | JWT (`localStorage`), role-based guards |

---

## 📊 Current Status (as of 2026-06-04)

| Area | Status |
|------|--------|
| Frontend TypeScript | ✅ Clean (0 errors, 25/25 issues resolved) |
| Backend TypeScript | ✅ Clean |
| AI matching (Ollama) | ✅ Complete (Phase 1–3) |
| Hugging Face integration | ✅ Added (1,000 req/day) |
| E2E test suite | ✅ 28/28 passing |
| Flag & moderation flow | ✅ Complete |
| Superadmin pages | ⚠️ Not yet implemented |
| Real-time vote updates | ⚠️ Phase 2 (Socket.IO) |

---

## 🔮 Roadmap

- **Superadmin** — platform-level user and community management
- **Real-time updates** — Socket.IO for live vote counts
- **Similar questions** — surface duplicate/related questions using stored `questionEmbedding` vectors (infrastructure already in place)
- **Duplicate detection** — flag near-identical questions before submission