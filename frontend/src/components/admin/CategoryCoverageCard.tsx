import { useNavigate } from '@tanstack/react-router'
import type { CategoryCoverageItem } from '@/types'

interface CategoryCoverageCardProps {
  category: CategoryCoverageItem
}

function resolutionColor(rate: number) {
  if (rate >= 70) return 'bg-green-500'
  if (rate >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function resolutionTextColor(rate: number) {
  if (rate >= 70) return 'text-green-600'
  if (rate >= 40) return 'text-amber-600'
  return 'text-red-500'
}

export function CategoryCoverageCard({ category }: CategoryCoverageCardProps) {
  const navigate = useNavigate()

  const {
    categoryId,
    categoryName,
    totalQuestions,
    resolvedCount,
    unresolvedCount,
    resolutionRate,
    faqCount,
    coverageGap,
    representativeQuery,
  } = category

  const faqBadgeClass = faqCount === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
  const barColor = resolutionColor(resolutionRate)
  const rateTextColor = resolutionTextColor(resolutionRate)

  function handleCreateFirstFaq() {
    navigate({
      to: '/admin/faqs',
      search: { prefillCategory: categoryId, prefillTitle: representativeQuery },
    } as any)
  }

  function handleAddMore() {
    navigate({
      to: '/admin/faqs',
      search: { prefillCategory: categoryId, prefillTitle: representativeQuery },
    } as any)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
      {/* Top row: name + badges */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900 text-base">{categoryName}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {/* Questions badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {totalQuestions} questions
          </span>
          {/* FAQ badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${faqBadgeClass}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {faqCount} FAQs
          </span>
        </div>
      </div>

      {/* Middle: resolution rate bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="font-medium">Resolution Rate</span>
          <span className={`font-semibold ${rateTextColor}`}>{resolutionRate}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all`}
            style={{ width: `${Math.min(resolutionRate, 100)}%` }}
          />
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-green-600">Resolved: {resolvedCount}</span>
          <span className="text-amber-600">Unresolved: {unresolvedCount}</span>
        </div>
      </div>

      {/* Bottom: representative query + CTA */}
      <div className="space-y-2">
        <div className="border-l-4 border-indigo-400 bg-gray-50 px-3 py-2 rounded-r">
          <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">Students are asking:</p>
          <p className="text-sm text-gray-700 italic leading-snug">{representativeQuery}</p>
        </div>

        <div>
          {faqCount === 0 ? (
            <button
              onClick={handleCreateFirstFaq}
              className="w-full px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Create First FAQ
            </button>
          ) : coverageGap > 10 ? (
            <button
              onClick={handleAddMore}
              className="w-full px-3 py-1.5 text-sm font-medium text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Add More FAQs
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium text-green-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Good Coverage
            </div>
          )}
        </div>
      </div>
    </div>
  )
}