import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Question, Answer } from '@/types'
import { AnswerCard } from '@/components/AnswerCard'
import { SubmitAnswerForm } from '@/components/SubmitAnswerForm'

async function fetchQuestion(id: string) {
  const { data } = await api.get(`/questions/${id}`)
  return data as Question
}

async function fetchAnswers(questionId: string) {
  const { data } = await api.get(`/questions/${questionId}/answers`)
  return data as Answer[]
}

type QuestionStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

const STATUS_STYLES: Record<QuestionStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-50 text-gray-500 border-gray-200',
}

export function QuestionDetailPage() {
  const { id } = useParams({ from: '/questions/$id' })

  const { data: question, isLoading: qLoading } = useQuery({
    queryKey: ['question', id],
    queryFn: () => fetchQuestion(id),
    enabled: !!id,
  })

  const { data: answers = [], isLoading: aLoading } = useQuery({
    queryKey: ['answers', id],
    queryFn: () => fetchAnswers(id),
  })

  const hasAcceptedAnswer = answers.some(a => a.isAccepted)

  if (qLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="space-y-2 mt-4">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Question not found.</p>
        <Link to="/questions" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">← Back to My Questions</Link>
      </div>
    )
  }

  const status = question.status as QuestionStatus
  const questionAuthorId = typeof question.askedBy === 'object' ? question.askedBy._id : question.askedBy
  const authorName = typeof question.askedBy === 'object' ? question.askedBy.name : 'You'

  const sortedAnswers = [...answers].sort((a, b) => b.upvotes - a.upvotes)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link to="/questions" className="hover:text-indigo-600">My Questions</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700 line-clamp-1">{question.title}</span>
      </nav>

      {/* Question */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {/* Status + category */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status]}`}>
            {status.replace('_', ' ')}
          </span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{question.category && typeof question.category === 'object' ? (question.category as { name: string }).name : question.category}</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-3">{question.title}</h1>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">{question.body}</p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 border-t pt-3">
          <span>Asked by {authorName}</span>
          <span>·</span>
          <span>{new Date(question.createdAt).toLocaleDateString()}</span>
          {question.tags?.length > 0 && (
            <>
              <span>·</span>
              <div className="flex gap-1 flex-wrap">
                {question.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">#{tag}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI match banner */}
        {question.aiMatchFaqId && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-700">
              <span className="font-medium">AI match found.</span>
              {' '}This question was matched to an existing FAQ with {Math.round((question.aiConfidence ?? 0) * 100)}% confidence.
            </p>
            {typeof question.aiMatchFaqId === 'object' && (
              <Link
                to="/faqs/$id"
                params={{ id: question.aiMatchFaqId._id }}
                className="mt-1 inline-block text-xs text-indigo-600 hover:underline"
              >
                View matched FAQ →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Answers header */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
        </h2>
      </div>

      {/* Answers list */}
      {aLoading && (
        <div className="space-y-3 mb-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!aLoading && sortedAnswers.length === 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center mb-6">
          <p className="text-sm text-gray-500">No answers yet. Be the first to answer!</p>
        </div>
      )}

      {!aLoading && sortedAnswers.length > 0 && (
        <div className="space-y-3 mb-6">
          {sortedAnswers.map(answer => (
            <AnswerCard
              key={answer._id}
              answer={answer}
              questionId={id}
              questionAuthorId={questionAuthorId}
              hasAcceptedAnswer={hasAcceptedAnswer}
            />
          ))}
        </div>
      )}

      {/* Submit answer */}
      <SubmitAnswerForm questionId={id} />
    </div>
  )
}