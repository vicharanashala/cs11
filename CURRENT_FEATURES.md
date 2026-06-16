# Current Features -- CrowdFAQ

> Compiled 2026-06-15 (Reputation System + Socket.IO). See `PHASE2_CHECKLIST.md` for what is still pending.

---

## Authentication & Users

| Feature | Details |
|---|---|
| JWT login | `POST /auth/login` -> JWT stored in `localStorage` |
| JWT signup | `POST /auth/register` -> auto-login, JWT issued |
| Token hydration | On app load: decode JWT client-side + validate with `GET /auth/me` |
| Auth redirect | 401 interceptor in axios -> redirect to `/login` |
| Logout | Clears `localStorage` token + user, redirects to `/login` |
| Role system | `intern` / `admin` / `superadmin` roles with guard helpers |
| First-time intern banner | `PATCH /auth/me/first-time` fires once per intern on `/ask` page |

---

## FAQ Browse & Search (Public to logged-in users)

| Feature | Details |
|---|---|
| FAQ grid | Infinite-scroll paginated list at `/faqs` |
| Search | Debounced text search (title/body) |
| Category filter | Pill-style filter with URL-driven state |
| FAQ card | Title, stripped body preview (uses `stripMarkdown`), category, tag pills, vote score |
| FAQ detail | Full markdown body, vote buttons, feedback widget |
| Markdown rendering | Custom lightweight renderer (headings, bold, italic, code, links, blockquotes, lists) |
| Vote colour coding | Green (positive), red (negative), grey (zero) |
| Real-time updates | Socket.IO `faq:published` -> `queryClient.invalidateQueries(['faqs'])` to surface new FAQs |

---

## Asking Questions

| Feature | Details |
|---|---|
| Question form | Title, body, category (dropdown), tags (comma-separated) |
| Intent detection | Keyword-based detection on title + body |
| Document status check | If intent matches (NOC / offer letter / internship beginning), returns student-specific `DocumentStatus` without saving question |
| DocumentStatusCard | Green/amber/red banner with progress bar, status badges, rejection reason |
| AI matching | Ollama or HuggingFace embeddings + application-level cosine similarity. `EMBEDDING_PROVIDER=ollama` (local), `huggingface` (cloud, recommended), or `mock` (dev/test). No Python microservice. 30s timeout, shape validation (384 dims), fail-fast if API key missing when `huggingface` is configured. |
| AI suggestion banner | Shows matched FAQ + confidence %; Accept -> view FAQ, Reject -> force save |
| Force submit | `?forceSubmit=true` bypasses both intent and AI match, saves directly |
| Category dropdown | Dynamically loaded from `GET /categories` |

---

## Questions & Answers

| Feature | Details |
|---|---|
| My Questions list | `/questions` -- all questions asked by the current user |
| Question detail | `/questions/:id` -- full question + all answers |
| Submit answer | `POST /questions/:id/answers` with body validation |
| Vote question | Vote up/down on question detail page; toggle (same dir), flip (opposite), add (new); self-vote disabled |
| Vote answers | Toggle/flip upvote/downvote on answers |
| Flag / Report | FlagButton on FAQ detail + AnswerCard; FlagModal with reason dropdown + optional comment; POST /flags |
| Accept answer | Question author can accept one answer (badge + pinned) |
| Answer sort | By vote score descending |
| AI match banner | Shown on question detail if `aiMatchFaqId` is set |
| Real-time updates | Socket.IO `vote:updated` (question/answer), `answer:created` (refetch answers), `question:statusChanged` (update status badge in cache) |

---

## Admin -- Resolution Queue

| Feature | Details |
|---|---|
| Queue page | `/admin/queries` -- open + in-progress questions |
| Real-time updates | Socket.IO `question:statusChanged` -> `queryClient.invalidateQueries(['admin-queries'])`; no more 30s polling |
| Resolve form | Admin writes official answer -> `PATCH /admin/queries/:id/resolve` |
| Official answer | Marked `isOfficialAdminAnswer: true`, question status -> `resolved` |
| Promote to FAQ | Admin fills modal (title, category ObjectId, tags) -> `POST /questions/:id/promote-faq` |
| Promote flow | Creates published FAQ, marks answer official, closes question, fires AI index rebuild |

---

## Admin -- FAQ Manager

| Feature | Details |
|---|---|
| FAQ table | Paginated list at `/admin/faqs` |
| Create FAQ | Form (title, body, category, tags) -> `POST /faqs` |
| Edit FAQ | Inline edit -> `PATCH /faqs/:id` |
| Archive FAQ | Status -> `archived` -> `PATCH /faqs/:id` |
| Rebuild AI Index | `POST /admin/rebuild-index` -> native NestJS (`FaqEmbeddingsService.rebuildAll()`) -> updates `Meta.lastIndexRebuild` |

---

## Admin -- Analytics

| Feature | Details |
|---|---|
| Overview tab | Total FAQs, AI match rate, total answers, avg resolution time |
| Question status bars | Open / in_progress / resolved / closed breakdown |
| Top contributors | Leaderboard sorted by reputation |
| FAQs by category | Bar chart with percentage bars |
| AI index staleness | Hours since last rebuild; amber warning if > 48h |
| Query Insights tab | Per-category coverage gap (questions per FAQ ratio) |
| Create FAQ shortcut | In Query Insights card -- quick link to create FAQ for that category |

---

## Backend Infrastructure

| Feature | Details |
|---|---|
| Global exception filter | Structured `{ statusCode, message, timestamp, path }` responses; 500 never leaks internals |
| Swagger docs | Available at `/api/docs` |
| Staleness tracking | `Meta.lastIndexRebuild` stamped only on successful AI rebuild |
| Compound unique indexes | `DocumentStatus` -- one record per student per document type |
| JWT guard | All protected routes; extracts `userId` (MongoDB ObjectId) from token |
| Admin guard | `AdminGuard` checks `role === 'admin' || role === 'superadmin'` |
| Vote toggle/flip | Both FAQs and questions support same-direction toggle and opposite-direction flip |
| AI graceful degradation | If the embedding provider is offline or embedding generation fails, questions save without an AI match. Embedding failures are logged, never block the user. |

---

## TypeScript Health

| | Status |
|---|---|
| Backend `tsc --noEmit` | Exit 0 |
| Frontend `tsc --noEmit` | Exit 0 |

---

## What's NOT here yet

See `PHASE2_CHECKLIST.md` for the full pending list, and `FUTURE_FEATURES.md` for ideas further out.

Key items still pending:
- Superadmin pages