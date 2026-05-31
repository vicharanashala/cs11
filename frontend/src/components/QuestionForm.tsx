import { useState } from 'react'
import { useMutation, useQuery, type UseMutationResult } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Category } from '@/types'

interface SubmissionPayload {
  title: string
  body: string
  category: string
  tags: string[]
}

interface AiMatchResult {
  faq: { _id: string; title: string; confidence: number }
}

interface AskApiResponse {
  intentMatch?: boolean
  intentType?: string
  statusResponse?: unknown
  aiMatch?: boolean
  faq?: AiMatchResult['faq']
  questionId?: string
  message?: string
}

interface QuestionFormProps {
  /**
   * Optional mutation injected from AskPage.
   * AskPage owns the response handling so it can dispatch on intent/AI-match/save.
   * When omitted, QuestionForm creates its own local mutation.
   */
  mutation?: UseMutationResult<any, any, any, any>
  onAiMatch?: (faq: AiMatchResult['faq'], payload: SubmissionPayload) => void
  onSuccess?: () => void
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0)
}

export function QuestionForm({ mutation: injectedMutation, onAiMatch, onSuccess }: QuestionFormProps) {
  const [form, setForm] = useState({ title: '', body: '', category: '', tags: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data } = await api.get('/categories')
      return data
    },
  })

  // Only create a local mutation when no mutation is injected from AskPage.
  // This prevents double-submission when AskPage owns the response handling.
  const localMutation = useMutation({
    mutationFn: (payload: SubmissionPayload) =>
      api.post<AskApiResponse>('/questions', payload),
    onSuccess: (res) => {
      const d = res.data
      if (d.aiMatch && d.faq) {
        onAiMatch?.(d.faq, {
          title: form.title.trim(),
          body: form.body.trim(),
          category: form.category,
          tags: parseTags(form.tags),
        })
      } else {
        onSuccess?.()
      }
    },
    onError: (err: unknown) => {
      // Surface the actual API error message; don't swallow it silently
      const e = err as { response?: { data?: { message?: string } } }
      setApiError(e.response?.data?.message ?? 'Failed to submit question.')
    },
  })

  const mutation = injectedMutation ?? localMutation

  function validate(): boolean {
    const e: Partial<typeof form> = {}
    if (!form.title.trim() || form.title.trim().length < 10)
      e.title = 'Title must be at least 10 characters'
    if (!form.body.trim() || form.body.trim().length < 30)
      e.body = 'Body must be at least 30 characters'
    if (!form.category) e.category = 'Please select a category'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)
    if (!validate()) return
    mutation.mutate({
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      tags: parseTags(form.tags),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {apiError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{apiError}</span>
          <button type="button" onClick={() => setApiError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="q-title" className="block text-sm font-medium text-gray-700 mb-1">Question title</label>
        <input
          id="q-title"
          type="text"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. How do I apply for on-campus housing?"
          className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors ${
            errors.title ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        <p className="mt-1 text-xs text-gray-400">Be specific. Min. 10 characters.</p>
      </div>

      {/* Body */}
      <div>
        <label htmlFor="q-body" className="block text-sm font-medium text-gray-700 mb-1">Details</label>
        <textarea
          id="q-body"
          rows={5}
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Provide more context about your question..."
          className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors resize-y ${
            errors.body ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
          }`}
        />
        {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
        <p className="mt-1 text-xs text-gray-400">Min. 30 characters.</p>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="q-category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          id="q-category"
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors bg-white ${
            errors.category ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
          }`}
        >
          <option value="">Select a category...</option>
          {categories.map(cat => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="q-tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="q-tags"
          type="text"
          value={form.tags}
          onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          placeholder="housing, accommodation, fees"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-400">Comma-separated</p>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? 'Submitting...' : 'Submit Question'}
      </button>
    </form>
  )
}