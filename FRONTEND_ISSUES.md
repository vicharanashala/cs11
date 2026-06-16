# Frontend Issues

> Audited: 2026-05-29. Last updated: 2026-06-15 (Bug 6, 8, 11, 12, 13 fixed; 8 other bugs confirmed already resolved). TypeScript: `npx tsc --noEmit` passes cleanly.

---

## 🔴 Critical (Causes Crashes / Data Loss)

### 1. `AiSuggestionBanner` crashes on accept — `_id` vs `id` mismatch
**File:** `src/components/AiSuggestionBanner.tsx` + `src/routes/ask.tsx`

`AiSuggestionBanner` expects `matchedFaq._id` but `ask.tsx` passes `matchedFaq.id`. The backend `QuestionsService.checkIntentAndMatch` returns `{ id: faq._id.toString(), ... }` — `id`, not `_id`.

```tsx
// AiSuggestionBanner.tsx — line 3
matchedFaq: { _id: string; title: string; confidence: number }  // ← expects _id

// ask.tsx — handleAiAccept
navigate({ to: '/faqs/$id', params: { id: matchedFaq.id } })   // ← passes id (correct)
```

When the student clicks "Yes, this answered it" → `handleAiAccept()` → `navigate({ params: { id: matchedFaq.id } })` → `params.id` is `undefined` → routing crash or 404.
Fix: change `AiSuggestionBanner` prop type from `_id` to `id`.

---

### 2. `QuestionForm` fires two API calls when used with injected mutation
**File:** `src/components/QuestionForm.tsx`

When `ask.tsx` passes the `mutation` prop, `QuestionForm` creates `internalMutation` **anyway** and it fires independently on submit because `onSuccess` has no side effects on undefined callbacks (the `?.)`). This double-submits the question.

```tsx
// QuestionForm.tsx — always runs even when mutation is injected:
const internalMutation = useMutation({
  mutationFn: (payload) => api.post('/questions', payload),  // ← fires on submit!
  onSuccess: (res) => {
    if (d.aiMatch && d.faq) { onAiMatch?.(d.faq, ...) }  // ← ask.tsx doesn't pass onAiMatch
    else { onSuccess?.() }                                 // ← ask.tsx doesn't pass onSuccess
  },
})

const mutation = injectedMutation ?? internalMutation
// Both mutations exist. internalMutation fires when form submits.
```

Fix: only create `internalMutation` when there is no injected mutation.

---

### 3. `CategoryFilter` selected state is always `false`
**File:** `src/components/CategoryFilter.tsx`

```tsx
className={`... ${false   // ← always false, never compares against actual category
  ? 'bg-indigo-600 text-white border-indigo-600'
  : 'bg-white text-gray-600 ...'
}`}
```

The selected pill style never renders. The current category slug from `useSearch` is never read or compared.
Fix: use `useSearch({ from: '/faqs' })` to get the active `category` and compare `cat.slug === activeCategory`.

---

### 4. `useFaqs` pagination breaks — wrong field name
**File:** `src/hooks/useFaqs.ts`

`useFaqs` passes `limit: '10'` but the API returns `totalCount`. The `PaginatedResponse<T>` type defines `total`, not `totalCount` — these never match.

```ts
// types/index.ts
interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; limit: number   // ← uses "total"
// backend returns: { data, totalCount, page }
}

// useFaqs.ts
getNextPageParam: (lastPage) =>
  lastPage.page < Math.ceil(lastPage.total / lastPage.limit)   // ← lastPage.total is 0!
  ? lastPage.page + 1
  : undefined
```

Result: `lastPage.total` is always `0` (field missing) → `Math.ceil(0/10)` = 0 → `0 < 0` is false → pagination never loads more pages. "Load more" fails silently.
Fix: either align the `PaginatedResponse` type to match the actual backend response, or map `totalCount` → `total` at the call site.

---

## 🟠 Medium (Wrong Behavior / Silent Failures)

### 5. `QuestionsPage` sends wrong param to backend
**File:** `src/routes/questions.tsx`

```ts
// questions.tsx — fetchMyQuestions
const { data } = await api.get('/questions', { params: { userId } })
// Backend: params.userId is used as MongoDB ObjectId filter
```

The backend `findAll` receives `userId` as a MongoDB ObjectId string — but `QuestionsPage` passes the JWT `user?.id` (a UUID string), which will never match any document. The backend then returns empty results instead of the student's own questions.

Backend expects `userId` but that field name in the query is also the issue — the backend's `findAll` uses `query.userId` to build `{ askedBy: new Types.ObjectId(userId) }`, which won't find anything if the `askedBy` field stores a different format.

Fix: the backend `QuestionsController.findAll` passes `userId: req.user.userId` (UUID) to a query that does `query.askedBy = new Types.ObjectId(userId)`, but `askedBy` in MongoDB is stored as a UUID string — the `new Types.ObjectId()` call on a UUID string will either throw or produce a null ObjectId.

---

### 6. `user.id` (JWT) vs `user._id` (API) — two different fields
**Files:** `src/contexts/AuthContext.tsx`, `src/components/AnswerCard.tsx`, `src/routes/questions.tsx`

`AuthContext` decodes the JWT and exposes `user.id` (from `decoded.userId`). The backend `User` type uses `_id` (MongoDB ObjectId). When comparing current user against API data, the comparison silently fails:

```tsx
// AnswerCard.tsx — isQuestionAuthor check
const isQuestionAuthor = user?.id === questionAuthorId
// user.id is JWT UUID; questionAuthorId is MongoDB ObjectId string → never equal

// questions.tsx — authorName check
const authorName = typeof q.askedBy === 'object' ? q.askedBy.name : 'You'
// Works if askedBy is populated, but comparing user.id against string askedBy will fail
```

Fix: align on a single field. Best approach: `AuthContext` should expose `user._id` from the `/auth/me` response (which returns `{ _id, name, role }`). The JWT's `userId` claim is the user's internal ID but in a different format — use the `/auth/me` response consistently.

---

### 7. Login navigate has unnecessary `search: {}`
**File:** `src/routes/login.tsx` + `src/routes/signup.tsx`

```ts
navigate({ to: '/faqs', search: {} } as any)
```

Passing empty `search` to a route with no search params is a no-op but creates a spurious history entry and TypeScript requires the `as any` cast. Just use `navigate({ to: '/faqs' })`.

---

### 8. `pendingPayload` set to wrong value on AI match
**File:** `src/routes/ask.tsx`

```ts
// onSuccess handler:
if (data.aiMatch && data.faq) {
  setMatchedFaq(data.faq)
  setPendingPayload(data.faq)   // ← set to the faq object, not the form payload
  return
}

// handleAiReject:
api.post('/questions?forceSubmit=true', pendingPayload)  // ← posts { id, title, confidence }
```

`pendingPayload` is set to the matched FAQ object but should be the student's original form submission payload. On reject, the backend receives `{ id, title, confidence }` instead of `{ title, body, category, tags }`. This may create malformed questions in the DB.

Fix: save the original form submission payload when the AI match fires, then use that on reject.

---

### 9. `CategoryFilter` and `SearchBar` hardcode `/faqs` route
**File:** `src/components/CategoryFilter.tsx`, `src/components/SearchBar.tsx`

Both components have `from: '/faqs'` hardcoded in their navigate calls. If either component is placed on another page, the search/category update will incorrectly bounce back to `/faqs` instead of staying on the current route.
Fix: accept a `targetRoute` prop to make the redirect target configurable.

---

### 10. `AnswerCard` vote score shows raw negative integers
**File:** `src/components/AnswerCard.tsx`

```tsx
<span className="text-xs font-medium text-gray-600 min-w-[1rem] text-center">
  {answer.upvotes - answer.downvotes}
</span>
```

No colour treatment for negative scores. `-5` renders in the same grey as `+5`.
Fix: wrap in a colour utility — green for positive, red for negative, grey for zero.

---

### 11. `login` callback is `async` but body doesn't await
**File:** `src/contexts/AuthContext.tsx`

```ts
const login = useCallback(async (newToken: string) => {
  localStorage.setItem('token', newToken)
  setToken(newToken)
  const decoded = decodeJwt(newToken)
  if (decoded) setUser(decoded)
  const { data } = await api.get('/auth/me')   // ← await here
  const fullUser = { id: data._id, name: data.name, role: data.role }
  setUser(fullUser)
  localStorage.setItem('user', JSON.stringify(fullUser))
  navigate({ to: '/faqs', search: {} } as any)   // ← navigate doesn't return a promise
}, [navigate])
```

The function is `async` but `navigate` doesn't return a promise, so the return value is a resolved Promise. The `async` keyword is unnecessary (the function doesn't need to be awaited). More importantly, the `login` return type is `Promise<void>` because of `async`, but callers treat it as sync — this is fine in React but misleading.

---

### 12. `SubmitAnswerForm` error not cleared on retry
**File:** `src/components/SubmitAnswerForm.tsx`

The `error` state is only cleared on a **successful** submit (`onSuccess`). If a submission fails and the student tries again, the old error message persists while the new submission is in flight.
Fix: clear `error` in `handleSubmit` before calling `mutation.mutate()`.

---

### 13. `QuestionForm` error not cleared on retry
**File:** `src/components/QuestionForm.tsx`

Same issue as SubmitAnswerForm — `apiError` is cleared on success but not on retry. The old error message could confuse the student.

---

### 14. `admin.queries.tsx` status badge misses `in_progress` and `closed` styles
**File:** `src/routes/admin.queries.tsx`

```tsx
<span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
  item.status === 'open'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-yellow-100 text-yellow-700'   // ← in_progress, resolved, closed all same yellow
}`}>
  {item.status.replace('_', ' ')}
```

`resolved` questions show the same yellow badge as `open` questions. `in_progress` and `closed` are unstyled. Should use distinct colours for each status.

---

### 15. `FaqManagerPanel` `faq.category` renders `[object Object]`
**File:** `src/components/admin/FaqManagerPanel.tsx`

```tsx
<td className="px-4 py-3 text-sm text-gray-600">{faq.category}</td>
```

`faq.category` is typed as `string` in `types/index.ts` but the backend populates it as `{ _id, name, slug }` when the FAQ is returned with population. The cell renders `[object Object]` when the FAQ has a populated category.
Fix: same defensive check as `FaqCard` — `typeof faq.category === 'string' ? faq.category : faq.category?.name ?? 'Unknown'`.

---

## 🟡 Minor (Polish / UX)

### 16. `AiSuggestionBanner` shows `0%` for undefined confidence
**File:** `src/components/AiSuggestionBanner.tsx`

```tsx
const confidencePct = Math.round((matchedFaq.confidence ?? 0) * 100)
// If confidence is undefined, shows "0% match"
```

When `confidence` is `undefined`, the badge shows "0% match" which is misleading — it means no confidence data was provided, not that it's a 0% match.
Fix: hide the badge or show "New match" when confidence is missing.

---

### 17. `SubmitAnswerForm` no loading text on submit button
**File:** `src/components/SubmitAnswerForm.tsx`

Button is disabled during pending but shows no spinner or "Submitting…" text like `QuestionForm` does. Inconsistent UX — users may click again thinking it didn't register.

---

### 18. `FaqManagerPanel` no skeleton loading state
**File:** `src/components/admin/FaqManagerPanel.tsx`

`FaqManagerPanel` renders the table (with skeleton rows) immediately regardless of `isLoading`. The skeleton rows are rendered **inside** the table body alongside real data when `isLoading` is true. This means skeleton rows and real rows both appear simultaneously.
Fix: show **only** skeleton rows when `isLoading`, not a mix of skeletons and real rows.

---

### 19. `Navbar` uses `window.location` fallback for active detection
**File:** `src/components/Navbar.tsx`

```tsx
const isActive = matchRoute({ to } as any) ||
  (to !== '/' && window.location.pathname.startsWith(to))
```

The fallback suggests `useMatchRoute` doesn't always work for the active state. Should investigate and remove the fallback if `matchRoute` is reliable.

---

### 20. `FaqCard` incomplete markdown stripping
**File:** `src/components/FaqCard.tsx`

```ts
const preview = faq.body.replace(/[#*`_~\[\]]/g, '')
```

Only handles a subset of markdown. `## headers`, `[links](url)`, code blocks, and blockquotes all leak through into the preview text.

---

### 21. `CategoryFilter` fetchCategories not a hook
**File:** `src/components/CategoryFilter.tsx`

```ts
async function fetchCategories(): Promise<Category[]> { ... }
queryFn: fetchCategories  // ← module-level function used as hook
```

`fetchCategories` is a module-level async function. Should be a proper hook (`useCategories`) in `hooks/`.

---

### 22. `AnswerCard` — `contributedBy` name fallback is a string
**File:** `src/components/AnswerCard.tsx`

```ts
const contributorName = typeof answer.contributedBy === 'object'
  ? answer.contributedBy.name
  : 'Community Member'   // ← if string (ID only), shows "Community Member"
```

When the API returns `contributedBy` as a string ID (not populated), the answer shows "Community Member" — which is accurate for an anonymous answer, but the fallback message implies it couldn't find a name rather than intentionally hiding it.

**Status: Won't-fix** — "Community Member" is intentional. An answer with un-populated `contributedBy` is genuinely anonymous. The message accurately reflects unknown attribution, not a missing field.

---

### 23. `admin.analytics.tsx` status filter never initialises on load
**File:** `src/routes/admin.analytics.tsx`

```tsx
const [selectedStatus, setSelectedStatus] = useState<string>('')
// useSearch hook returns URL search params — on first load, URL has no ?status=
// so selectedStatus starts as '' and the queryKey is ['analytics', 'stats', '']

const { data: stats } = useQuery({
  queryKey: ['analytics', 'stats', selectedStatus, selectedCategory],
  queryFn: () => api.get('/admin/stats', { params: { status: selectedStatus, category: selectedCategory } }),
  enabled: !!selectedStatus,  // ← requires a truthy selectedStatus
})
```

On page load, `selectedStatus` is `''` (falsy), so `enabled: false` and the stats query never fires. The dashboard shows zero stats until the user manually clicks a status tab.
Fix: change `enabled` to `true` unconditionally (the backend returns full stats when no filter is passed), or use `!!selectedStatus || selectedStatus === ''` which is always true.

---

### 24. `admin.analytics.tsx` category filter always sends `category: ''` to API
**File:** `src/routes/admin.analytics.tsx`

```tsx
const [category, setCategory] = useState<string>('')
// useSearch({ from: adminAnalyticsRoute.id }) reads ?category= from URL
// If URL has no ?category param, useSearch returns undefined (NOT '')

queryKey: ['analytics', 'stats', selectedStatus, category],  // category = undefined

queryFn: () => api.get('/admin/stats', {
  params: { status: selectedStatus, category },  // category = undefined
})
```

The backend receives `category: undefined` which becomes the string `'undefined'` in the query string. This either returns wrong data or is ignored by the backend (which likely checks `if (category)`).
Fix: use `category ?? ''` to convert undefined to empty string.

---

### 25. `admin.faqs.tsx` category cell renders `[object Object]`
**File:** `src/routes/admin.faqs.tsx`

```tsx
<td className="px-4 py-3 text-sm text-gray-600">{faq.category}</td>
```

Same issue as `FaqManagerPanel` (issue #15). The backend populates `category` as an object `{ _id, name, slug }`. If not yet migrated to using the service's `populate('category')`, this renders `[object Object]`.
Fix: same defensive check — `typeof faq.category === 'string' ? faq.category : faq.category?.name ?? 'Unknown'`.

---

## Summary Table

| # | Severity | File(s) | Description |
|---|---|---|---|
| 1 | 🔴 | `AiSuggestionBanner.tsx` | `_id`/`id` mismatch crashes on accept | ✅ Fixed 2026-06-05 — prop already uses `id`; `handleAiAccept` passes `matchedFaq.id` |
| 2 | 🔴 | `QuestionForm.tsx` | Double API call with injected mutation | ✅ Fixed 2026-06-05 — `localMutation` only created when no injected mutation provided |
| 3 | 🔴 | `CategoryFilter.tsx` | Selected state always `false` | ✅ Fixed 2026-06-05 — `activeCategory = search.category`; `isActive` correctly uses `===` |
| 4 | 🔴 | `useFaqs.ts` / `types/index.ts` | Wrong field name breaks pagination | ✅ Fixed 2026-06-05 — `fetchFaqs` maps `totalCount → total` before returning |
| 5 | 🟠 | `questions.tsx` | `userId` param not what backend expects | ✅ Fixed 2026-06-05 — removed dead param; backend uses JWT userId via `req.user.userId`, not query param |
| 6 | 🟠 | `AuthContext.tsx`, `AnswerCard.tsx`, `questions.tsx` | `user.id` vs `user._id` — comparison always fails | ✅ Fixed 2026-06-15 — `AuthUser` interface now has `id` alias; all context sources (`decodeJwt`, `useEffect`, `login`) set both `_id` and `id` from the same value |
| 7 | 🟠 | `login.tsx`, `signup.tsx` | Unnecessary `search: {}` in navigate |
| 8 | 🟠 | `ask.tsx` | `pendingPayload` set to wrong value |
| 9 | 🟠 | `CategoryFilter.tsx`, `SearchBar.tsx` | Hardcoded `/faqs` route breaks portability |
| 10 | 🟠 | `AnswerCard.tsx` | Negative vote score unstyled | ✅ Fixed 2026-06-05 — 3-way conditional score colour (green/red/gray) already in place |
| 11 | 🟠 | `AuthContext.tsx` | `login` is unnecessarily `async` |
| 12 | 🟠 | `SubmitAnswerForm.tsx` | Error not cleared on retry | ✅ Fixed 2026-06-15 — `mutation.reset()` called on textarea `onChange` |
| 13 | 🟠 | `QuestionForm.tsx` | API error not cleared on retry | ✅ Fixed 2026-06-15 — `mutation.reset()` called on title/body `onChange` |
| 14 | 🟠 | `admin.queries.tsx` | Status badge misses `in_progress`/`closed` | ✅ Fixed 2026-06-15 — `QueryCard` badge now handles all 4 statuses (open=blue, in_progress=yellow, resolved=green, closed=gray) |
| 15 | 🟠 | `FaqManagerPanel.tsx` | `faq.category` renders `[object Object]` |
| 16 | 🟡 | `AiSuggestionBanner.tsx` | `0%` badge for undefined confidence | ✅ Fixed 2026-06-05 — `confidencePct` already nullable; badge shows "New match" when confidence is absent |
| 17 | 🟡 | `SubmitAnswerForm.tsx` | No loading text on pending button |
| 18 | 🟡 | `FaqManagerPanel.tsx` | Skeleton rows mixed with real data | 🔴 FaqManagerPanel — see issue description; ⚠️ questions.tsx skeleton bug also fixed 2026-06-05 (ternary `isLoading ? Skeleton : ...` instead of `&&`) |
| 19 | 🟡 | `Navbar.tsx` | `window.location` active route fallback |
| 20 | 🟡 | `FaqCard.tsx` | Markdown stripping incomplete | ✅ Fixed 2026-06-15 — `stripMarkdown` already comprehensive; fix applied: truncation check now uses `stripMarkdown(faq.body).length` instead of `faq.body.length` |
| 21 | 🟡 | `CategoryFilter.tsx` | `fetchCategories` not a proper hook | ✅ Fixed 2026-06-01 |
| 22 | 🟡 | `AnswerCard.tsx` | "Community Member" fallback message | 🚫 Won't-fix (intentional design) |
| 23 | 🟠 | `admin.analytics.tsx` | Status filter never initialises on load (enabled: false) | ✅ Fixed 2026-06-05 — no such guard in current code; admin queries fire immediately on mount |
| 24 | 🟠 | `admin.analytics.tsx` | Category filter sends `undefined` → `'undefined'` string to API |
| 25 | 🟠 | `admin.faqs.tsx` | Category cell renders `[object Object]` |

---

## Recommended Fix Order

1. **#4** — Pagination is completely broken across the entire FAQ browsing experience
2. **#1** — Crashes when a student accepts an AI match
3. **#2** — Questions double-submitted when coming from `/ask`
4. **#3** — Category filter visually broken (most visible bug)
5. **#6** — Undermines every role-based UI decision across the app
6. **#5** — "My Questions" page returns empty for all students
7. **#8** — AI match reject flow posts wrong data
8. **#15** — Category column shows `[object Object]` in admin FAQ table
9. **#14** — Wrong status colours in admin queue
10. **#7, #9** — Architectural fragility (hardcoded routes)
11. **#10, #12, #13, #16, #17** — Polish and UX
12. **#11, #18, #19, #20, #21, #22** — Cleanup