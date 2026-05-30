import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QueryCard } from '@/components/admin/QueryCard'

interface QueryQueueItem {
  questionId: string
  title: string
  askedBy: { name: string }
  createdAt: string
  answerCount: number
  status: string
}

interface QueueResponse {
  data: QueryQueueItem[]
  totalCount: number
  page: number
}

export function AdminQueriesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-queries', page],
    queryFn: async () => {
      const { data: res } = await api.get('/admin/queries', {
        params: { page: String(page), limit: '20' },
      })
      return res as QueueResponse
    },
    refetchInterval: 30_000,
  })

  function handleResolved(questionId: string) {
    queryClient.setQueryData<QueueResponse>(['admin-queries', page], (old) => {
      if (!old) return old
      return { ...old, data: old.data.filter((q) => q.questionId !== questionId) }
    })
  }

  const totalPages = data ? Math.ceil(data.totalCount / 20) : 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Resolution Queue</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data ? `${data.totalCount} unresolved question${data.totalCount !== 1 ? 's' : ''} waiting` : 'Loading…'}
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="text-xs text-indigo-600 animate-pulse">Refreshing…</span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && data.data.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500 font-medium">Queue is clear!</p>
          <p className="text-sm text-gray-400 mt-1">All open questions have been resolved.</p>
        </div>
      )}

      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="space-y-3">
            {data.data.map((item) => (
              <QueryCard key={item.questionId} item={item} onResolved={handleResolved} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}