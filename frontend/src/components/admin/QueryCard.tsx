import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'

interface QueryQueueItem {
  questionId: string
  _id?: string
  title: string
  askedBy: { name: string }
  category?: { name: string; slug: string; color: string }
  createdAt: string
  answerCount: number
  status?: string
}

interface PromoteModalData {
  title: string
  category: string
  tags: string[]
}

interface QueryCardProps {
  item: QueryQueueItem
  onResolved: (questionId: string) => void
}

export function QueryCard({ item, onResolved }: QueryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [responseBody, setResponseBody] = useState('')
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [promoteTitle, setPromoteTitle] = useState(item.title)
  const [promoteCategory, setPromoteCategory] = useState('')
  const [promoteTags, setPromoteTags] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // Resolve using whichever id field the backend returned
  const resolveId = item.questionId ?? item._id ?? ''

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: (body: string) =>
      api.patch(`/admin/queries/${resolveId}/resolve`, { responseBody: body }),
    onSuccess: () => {
      showToast('Question resolved successfully.')
      setResponseBody('')
      setExpanded(false)
      onResolved(resolveId)
    },
    onError: () => showToast('Failed to resolve. Please try again.'),
  })

  // Promote mutation
  const promoteMutation = useMutation({
    mutationFn: (payload: PromoteModalData) =>
      api.post(`/questions/${resolveId}/promote-faq`, payload),
    onSuccess: () => {
      showToast('Question promoted to FAQ.')
      setShowPromoteModal(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Promote failed.'
      showToast(msg)
    },
  })

  function handleResolve() {
    if (!responseBody.trim()) return
    resolveMutation.mutate(responseBody)
  }

  function handlePromote() {
    if (!promoteTitle.trim() || !promoteCategory.trim()) return
    const tags = promoteTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    promoteMutation.mutate({ title: promoteTitle, category: promoteCategory, tags })
  }

  // Safe status label — guards against undefined
  const statusLabel = (item.status ?? 'open').replace('_', ' ')
  const statusClass =
    item.status === 'open'
      ? 'bg-blue-100 text-blue-700'
      : item.status === 'in_progress'
      ? 'bg-yellow-100 text-yellow-700'
      : item.status === 'resolved'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-600'

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>
                Asked by{' '}
                <span className="font-medium">{item.askedBy?.name ?? 'Unknown'}</span>
              </span>
              <span>·</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {item.answerCount ?? 0} answer{(item.answerCount ?? 0) !== 1 ? 's' : ''}
              </span>
              {item.category?.name && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: (item.category.color ?? '#6366f1') + '22',
                    color: item.category.color ?? '#6366f1',
                  }}
                >
                  {item.category.name}
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {expanded ? 'Collapse' : 'Resolve'}
            </button>
            <button
              onClick={() => {
                setShowPromoteModal(true)
                setPromoteTitle(item.title)
              }}
              className="px-3 py-1 text-xs font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
            >
              Promote to FAQ
            </button>
          </div>
        </div>

        {/* Expandable resolve form */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Write an official answer
            </label>
            <textarea
              value={responseBody}
              onChange={(e) => setResponseBody(e.target.value)}
              placeholder="Write the official answer to this question..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 resize-none mb-3"
            />
            <div className="flex items-center justify-end">
              <button
                onClick={handleResolve}
                disabled={!responseBody.trim() || resolveMutation.isPending}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resolveMutation.isPending ? 'Submitting...' : 'Submit Resolution'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Promote to FAQ modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Promote to FAQ</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={promoteTitle}
                  onChange={(e) => setPromoteTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category ID
                </label>
                <input
                  type="text"
                  value={promoteCategory}
                  onChange={(e) => setPromoteCategory(e.target.value)}
                  placeholder="MongoDB ObjectId of the category"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={promoteTags}
                  onChange={(e) => setPromoteTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={
                  !promoteTitle.trim() ||
                  !promoteCategory.trim() ||
                  promoteMutation.isPending
                }
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {promoteMutation.isPending ? 'Promoting...' : 'Promote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}