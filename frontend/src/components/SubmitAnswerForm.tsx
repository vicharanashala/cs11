import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface SubmitAnswerFormProps {
  questionId: string
  /** Optional callback fired after a successful submission — use to invalidate parent query caches. */
  onSuccess?: () => void
}

export function SubmitAnswerForm({ questionId, onSuccess }: SubmitAnswerFormProps) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.post(`/questions/${questionId}/answers`, { body }),
    onSuccess: () => {
      setBody('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['question', questionId] })
      queryClient.invalidateQueries({ queryKey: ['answers', questionId] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Failed to submit answer.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (body.trim().length < 20) {
      setError('Answer must be at least 20 characters.')
      return
    }
    setError(null)
    mutation.mutate()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Answer</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={e => { setBody(e.target.value); mutation.reset() }}
          rows={4}
          placeholder="Share your knowledge or experience…"
          className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors resize-y ${
            error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
          }`}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
        <p className="mt-1 text-xs text-gray-400">Min. 20 characters.</p>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit Answer'}
          </button>
        </div>
      </form>
    </div>
  )
}