import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { Question } from '@/types'

type QuestionStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

const STATUS_STYLES: Record<QuestionStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUS_LABELS: Record<QuestionStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

async function fetchMyQuestions(userId: string) {
  const { data } = await api.get('/questions', { params: { userId } })
  return data as { data: Question[]; totalCount: number; page: number }
}

export function QuestionsPage() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['questions', 'my', user?._id],
    queryFn: () => fetchMyQuestions(user!._id),
    enabled: !!user?._id,
  })

  const questions = data?.data ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Questions</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage your asked questions</p>
        </div>
        <Link
          to="/ask"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Ask a Question
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && questions.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-1">No questions asked yet</p>
          <p className="text-sm text-gray-400 mb-4">Be the first to ask something!</p>
          <Link
            to="/ask"
            className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Ask a Question
          </Link>
        </div>
      )}

      {!isLoading && questions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {questions.map((q) => {
            const status = q.status as QuestionStatus
            const authorName = typeof q.askedBy === 'object' ? q.askedBy.name : 'You'
            return (
              <div key={q._id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      <Link
                        to="/questions/$id"
                        params={{ id: q._id }}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {q.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">{q.body}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{authorName}</span>
                      <span>·</span>
                      <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                      {q.tags?.length > 0 && (
                        <>
                          <span>·</span>
                          <div className="flex gap-1">
                            {q.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">#{tag}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <Link
                      to="/questions/$id"
                      params={{ id: q._id }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      View ›
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}