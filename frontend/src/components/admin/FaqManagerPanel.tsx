import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { FAQ } from '@/types'

// ---- Types ----

// ---- Create / Edit FAQ form ----

interface FaqFormData {
  title: string
  body: string
  category: string
  tags: string
  status: 'draft' | 'published' | 'archived'
}

interface FaqFormProps {
  initial?: Partial<FaqFormData>
  faqId?: string
  onClose: () => void
  onSuccess: () => void
}

function FaqForm({ initial, faqId, onClose, onSuccess }: FaqFormProps) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(faqId)

  const [form, setForm] = useState<FaqFormData>({
    title: initial?.title ?? '',
    body: initial?.body ?? '',
    category: initial?.category ?? '',
    tags: initial?.tags ?? '',
    status: initial?.status ?? 'published',
  })

  const mutation = useMutation({
    mutationFn: (payload: FaqFormData) => {
      const body = { ...payload, tags: payload.tags.split(',').map((t) => t.trim()).filter(Boolean) }
      if (isEdit) return api.patch(`/faqs/${faqId}`, body)
      return api.post('/faqs', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] })
      onSuccess()
    },
    onError: () => alert('Failed to save FAQ. Check your fields.'),
  })

  function set<K extends keyof FaqFormData>(key: K, value: FaqFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Body <span className="text-gray-400 font-normal">(markdown)</span>
        </label>
        <textarea
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          required
          rows={8}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 font-mono resize-y"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category ID</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as FaqFormData['status'])}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 bg-white"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => set('tags', e.target.value)}
          placeholder="password, portal, account"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? 'Saving...' : isEdit ? 'Update FAQ' : 'Create FAQ'}
        </button>
      </div>
    </form>
  )
}

// ---- Inline edit row ----

interface FaqRowProps {
  faq: FAQ
  onEdit: (faq: FAQ) => void
  onArchive: (faqId: string) => void
}

function FaqRow({ faq, onEdit, onArchive }: FaqRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3 max-w-xs">
        <p className="text-sm font-medium text-gray-900 truncate">{faq.title}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {typeof faq.category === 'string'
          ? faq.category
          : (faq.category as any)?.name ?? 'Unknown'}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
            faq.status === 'published'
              ? 'bg-green-100 text-green-700'
              : faq.status === 'archived'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {faq.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{faq.viewCount.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{faq.upvotes.toLocaleString()}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{new Date(faq.createdAt).toLocaleDateString()}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(faq)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onArchive(faq._id)}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Archive
          </button>
        </div>
      </td>
    </tr>
  )
}

// ---- Main panel ----

interface FaqManagerPanelProps {
  prefill?: { category?: string; title?: string }
  autoOpenCreate?: boolean
  onAutoOpenHandled?: () => void
}

export function FaqManagerPanel({ prefill, autoOpenCreate, onAutoOpenHandled }: FaqManagerPanelProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editFaq, setEditFaq] = useState<FAQ | null>(null)
  const limit = 10

  // Auto-open create form when navigated from CategoryCoverageCard
  useEffect(() => {
    if (autoOpenCreate) {
      setShowCreateForm(true)
      onAutoOpenHandled?.()
    }
  }, [autoOpenCreate, onAutoOpenHandled])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-faqs', page, search],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit), status: '' }
      if (search) params['title'] = search
      const { data: res } = await api.get('/faqs', { params })
      return res as { data: FAQ[]; totalCount: number }
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (faqId: string) => api.delete(`/faqs/${faqId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] })
    },
  })

  function handleArchive(faqId: string) {
    if (!confirm('Archive this FAQ?')) return
    archiveMutation.mutate(faqId)
  }

  function handleFormSuccess() {
    setShowCreateForm(false)
    setEditFaq(null)
  }

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0

  // Build a sliding window of page buttons centered around current page
  function getPageButtons(current: number, total: number): number[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
    const half = 2
    let start = Math.max(1, current - half)
    let end = Math.min(total, start + 4)
    if (end - start < 4) start = Math.max(1, end - 4)
    const pages: number[] = []
    for (let p = start; p <= end; p++) pages.push(p)
    return pages
  }

  const pageButtons = getPageButtons(page, totalPages)

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search FAQs by title..."
            className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Create New FAQ
        </button>
      </div>

      {/* Create form panel */}
      {showCreateForm && (
        <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">New FAQ</h3>
          <FaqForm
            initial={{
              title: prefill?.title ?? '',
              category: prefill?.category ?? '',
            }}
            onClose={() => setShowCreateForm(false)}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}

      {/* Edit form panel */}
      {editFaq && (
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Edit FAQ — {editFaq.title}</h3>
          <FaqForm
            faqId={editFaq._id}
            initial={{
              title: editFaq.title,
              body: editFaq.body,
              category: typeof editFaq.category === 'string' ? editFaq.category : '',
              tags: editFaq.tags.join(', '),
              status: editFaq.status,
            }}
            onClose={() => setEditFaq(null)}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Views</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Upvotes</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Created</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24 animate-pulse" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && data?.data.map((faq) => (
              <FaqRow
                key={faq._id}
                faq={faq}
                onEdit={(f) => setEditFaq(f)}
                onArchive={handleArchive}
              />
            ))}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No FAQs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data?.totalCount ?? 0)} of {data?.totalCount}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            {pageButtons.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 text-xs border rounded transition-colors ${
                  p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}