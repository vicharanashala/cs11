import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { QuestionForm } from '@/components/QuestionForm'
import { AiSuggestionBanner } from '@/components/AiSuggestionBanner'
import { DocumentStatusCard } from '@/components/DocumentStatusCard'
import api from '@/lib/api'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface SubmissionPayload {
  title: string
  body: string
  category: string
  tags: string[]
}

interface AiMatchResult {
  id: string
  title: string
  confidence?: number
}

export interface StatusRecord {
  documentType: 'noc' | 'offer_letter_download' | 'offer_letter_acceptance' | 'internship_beginning'
  status: 'pending' | 'completed' | 'under_review' | 'rejected' | 'requires_resubmission'
  statusMessage: string
  completedAt?: string
}

export interface StatusResponse {
  type: 'document_status'
  records: StatusRecord[]
  overallMessage: string
  completionPercentage: number
}

interface AskApiResponse {
  intentMatch?: boolean
  intentType?: string
  statusResponse?: StatusResponse
  aiMatch?: boolean
  faq?: AiMatchResult
  questionId?: string
  message?: string
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function AskPage() {
  const navigate = useNavigate()

  const [matchedFaq, setMatchedFaq] = useState<AiMatchResult | null>(null)
  const [pendingPayload, setPendingPayload] = useState<SubmissionPayload | null>(null)
  const [statusResponse, setStatusResponse] = useState<StatusResponse | null>(null)

  const submissionMutation = useMutation({
    mutationFn: (payload: SubmissionPayload) =>
      api.post<AskApiResponse>('/questions', payload),
    onSuccess: (res) => {
      const data = res.data

      // Shape 3 — intent detection
      if (data.intentMatch && data.statusResponse) {
        setStatusResponse(data.statusResponse)
        return
      }

      // Shape 2 — AI match (payload set via onAiMatch callback from QuestionForm)
      if (data.aiMatch && data.faq) {
        setMatchedFaq(data.faq)
        return
      }

      // Shape 1 — question saved
      navigate({ to: '/questions' })
    },
  })

  function handleAiAccept() {
    if (!matchedFaq) return
    navigate({ to: '/faqs/$id', params: { id: matchedFaq.id } })
  }

  function handleAiReject() {
    if (!pendingPayload) return
    api.post('/questions?forceSubmit=true', pendingPayload)
      .then(() => navigate({ to: '/questions' }))
  }

  function handleStatusBack() {
    setStatusResponse(null)
  }

  // Shape 3 — intent match: show read-only document status
  if (statusResponse) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <DocumentStatusCard statusResponse={statusResponse} />
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleStatusBack}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Ask a different question
          </button>
        </div>
      </div>
    )
  }

  // Shape 2 — AI suggestion banner
  if (matchedFaq) {
    return (
      <AiSuggestionBanner
        matchedFaq={matchedFaq}
        onAccept={handleAiAccept}
        onReject={handleAiReject}
      />
    )
  }

  // Normal form view
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ask a Question</h1>
        <p className="mt-1 text-sm text-gray-500">
          The community or AI may already have an answer for you.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <QuestionForm
          mutation={submissionMutation}
          onAiMatch={(_faq, payload) => setPendingPayload(payload)}
          onSuccess={() => navigate({ to: '/questions' })}
        />
      </div>
    </div>
  )
}