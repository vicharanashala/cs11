interface AiSuggestionBannerProps {
  matchedFaq: {
    id: string
    title: string
    confidence?: number
  }
  onAccept: () => void
  onReject: () => void
}

export function AiSuggestionBanner({ matchedFaq, onAccept, onReject }: AiSuggestionBannerProps) {
  const confidencePct = matchedFaq.confidence != null
    ? Math.round(matchedFaq.confidence * 100)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-amber-900">We found a potential answer!</h2>
            <p className="mt-0.5 text-sm text-amber-700">
              This question looks similar to an existing FAQ. Check it before posting.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-amber-100 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
              Matched FAQ
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {confidencePct !== null ? `${confidencePct}% match` : 'New match'}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900">{matchedFaq.title}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            ✓ Yes, this answered it
          </button>
          <button
            onClick={onReject}
            className="flex-1 py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            No, submit my question anyway
          </button>
        </div>
      </div>
    </div>
  )
}