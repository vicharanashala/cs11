import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Answer } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

interface AnswerCardProps {
  answer: Answer
  questionId: string
  questionAuthorId: string
  hasAcceptedAnswer: boolean
}

export function AnswerCard({ answer, questionId, questionAuthorId, hasAcceptedAnswer }: AnswerCardProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const contributorName = typeof answer.contributedBy === 'object'
    ? answer.contributedBy.name
    : 'Community Member'

  const contributorId = typeof answer.contributedBy === 'object'
    ? answer.contributedBy._id
    : answer.contributedBy

  const isOwnAnswer = user?._id === contributorId
  const isQuestionAuthor = user?._id === questionAuthorId
  const canAccept = isQuestionAuthor && !hasAcceptedAnswer && !answer.isAccepted

  const voteMutation = useMutation({
    mutationFn: (value: 1 | -1) =>
      api.post(`/questions/${questionId}/answers/${answer._id}/vote`, { value }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['answers', questionId] }),
  })

  const acceptMutation = useMutation({
    mutationFn: () =>
      api.patch(`/questions/${questionId}/answers/${answer._id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question', questionId] })
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] })
    },
  })

  return (
    <div className={`bg-white rounded-xl border p-5 ${answer.isAccepted ? 'border-green-200' : 'border-gray-200'}`}>
      {/* Accepted badge */}
      {answer.isAccepted && (
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-semibold text-green-700">Accepted Answer</span>
        </div>
      )}

      {/* Body */}
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
        {answer.body}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Vote buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => voteMutation.mutate(1)}
              disabled={isOwnAnswer || voteMutation.isPending}
              className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Upvote"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className={`text-xs font-medium min-w-[1rem] text-center ${
              answer.upvotes - answer.downvotes > 0
                ? 'text-green-600'
                : answer.upvotes - answer.downvotes < 0
                ? 'text-red-500'
                : 'text-gray-500'
            }`}>
              {answer.upvotes - answer.downvotes}
            </span>
            <button
              onClick={() => voteMutation.mutate(-1)}
              disabled={isOwnAnswer || voteMutation.isPending}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Downvote"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{contributorName}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-400">
            {new Date(answer.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Accept button */}
        {canAccept && (
          <button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
          >
            Accept this answer
          </button>
        )}
      </div>
    </div>
  )
}