import { useState } from 'react'
import { useReputation } from '@/hooks/useReputation'
import type { ReputationEventName } from '@/types'

const EARNING_GUIDE: { event: ReputationEventName; points: number; label: string }[] = [
  { event: 'faq_contributed',     points: 25, label: 'Your answer promoted to FAQ' },
  { event: 'answer_accepted',     points: 15, label: 'Your answer accepted' },
  { event: 'answer_upvoted',      points: 10, label: 'Your answer upvoted' },
  { event: 'question_answered',   points:  2, label: 'You posted an answer' },
  { event: 'answer_downvote_reversed', points: -5, label: 'Upvote on your answer removed' },
  { event: 'answer_downvoted',    points: -2, label: 'Your answer downvoted' },
]

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs  = Math.floor(diff / 1000)
  const mins  = Math.floor(secs  / 60)
  const hours = Math.floor(mins  / 60)
  const days  = Math.floor(hours / 24)
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0)  return `${mins}m ago`
  return 'just now'
}

function EventRow({ item }: { item: { event: ReputationEventName; points: number; description: string; createdAt: string } }) {
  const guide = EARNING_GUIDE.find((g) => g.event === item.event)
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-gray-800">{item.description}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {guide?.label ?? item.event.replace(/_/g, ' ')}
        </p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <span className={`text-sm font-semibold ${item.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {item.points > 0 ? `+${item.points}` : item.points}
        </span>
        <span className="text-xs text-gray-400 mt-0.5">{formatRelative(item.createdAt)}</span>
      </div>
    </div>
  )
}

export function ReputationPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useReputation(page)

  const totalPages = data ? Math.ceil(data.history.total / data.history.limit) : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-3">
          <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isLoading ? '—' : (data?.reputation ?? 0)}
        </h1>
        <p className="text-gray-500 text-sm mt-1">reputation points</p>
      </div>

      <p className="text-center text-sm text-gray-500 mb-6">
        Earn points by contributing answers, getting upvotes, and having your answers accepted.
      </p>

      {/* Earning guide */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">How to earn points</h2>
        <div className="space-y-1.5">
          {EARNING_GUIDE.map((g) => (
            <div key={g.event} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{g.label}</span>
              <span className={`font-medium ${g.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {g.points > 0 ? `+${g.points}` : g.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 px-4 pt-4 mb-1">History</h2>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-4 text-sm text-red-500">Failed to load reputation history.</p>
        ) : data?.history.data.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">
            No reputation events yet. Start by answering questions!
          </p>
        ) : (
          <>
            <div className="px-4">
              {data!.history.data.map((item) => (
                <EventRow key={item._id} item={item} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-3 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}