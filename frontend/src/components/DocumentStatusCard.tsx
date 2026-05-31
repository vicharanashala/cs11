import type { DocumentType, DocumentStatusValue, StatusRecord, StatusResponse } from '@/types'

export type { DocumentType, DocumentStatusValue } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOC_LABELS: Record<DocumentType, string> = {
  noc: 'NOC Submission',
  offer_letter_download: 'Offer Letter Download',
  offer_letter_acceptance: 'Offer Letter Acceptance',
  internship_beginning: 'Internship Commencement',
}

const DOC_SORT_ORDER: DocumentType[] = [
  'noc',
  'offer_letter_download',
  'offer_letter_acceptance',
  'internship_beginning',
]

const STATUS_BADGE_CLASSES: Record<DocumentStatusValue, string> = {
  pending: 'bg-gray-100 text-gray-600',
  under_review: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  requires_resubmission: 'bg-orange-100 text-orange-700',
}

const STATUS_LABEL: Record<DocumentStatusValue, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  completed: 'Completed',
  rejected: 'Rejected',
  requires_resubmission: 'Requires Resubmission',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bannerBg(records: StatusRecord[], completionPercentage: number): string {
  if (completionPercentage === 100) return 'bg-green-50 border-green-200 text-green-800'
  if (records.some(r => r.status === 'rejected' || r.status === 'requires_resubmission')) {
    return 'bg-red-50 border-red-200 text-red-800'
  }
  return 'bg-amber-50 border-amber-200 text-amber-800'
}

function progressFillBg(completionPercentage: number): string {
  return completionPercentage === 100 ? 'bg-green-500' : 'bg-amber-500'
}

function sortRecords(records: StatusRecord[]): StatusRecord[] {
  return [...records].sort(
    (a, b) => DOC_SORT_ORDER.indexOf(a.documentType) - DOC_SORT_ORDER.indexOf(b.documentType),
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DocumentStatusCardProps {
  statusResponse: StatusResponse
}

export function DocumentStatusCard({ statusResponse }: DocumentStatusCardProps) {
  const { records, overallMessage, completionPercentage } = statusResponse
  const sortedRecords = sortRecords(records)
  const bannerClass = bannerBg(sortedRecords, completionPercentage)
  const fillClass = progressFillBg(completionPercentage)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Overall banner */}
      <div className={`px-6 py-4 border-b border-gray-200 ${bannerClass}`}>
        <p className="text-sm font-medium">{overallMessage}</p>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${fillClass}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 w-10 text-right shrink-0">
            {completionPercentage}%
          </span>
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          {sortedRecords.filter(r => r.status === 'completed').length} of 4 steps completed
        </p>
      </div>

      {/* Document cards */}
      <div className="divide-y divide-gray-100">
        {sortedRecords.map(record => (
          <div key={record.documentType} className="px-6 py-4">
            {/* Label + badge row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">
                {DOC_LABELS[record.documentType]}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[record.status]}`}>
                {STATUS_LABEL[record.status]}
              </span>
            </div>

            {/* Status message */}
            <p className="text-sm text-gray-700">{record.statusMessage}</p>

            {/* Rejection reason */}
            {record.status === 'rejected' || record.status === 'requires_resubmission' ? (
              <div className="mt-2 px-3 py-2 bg-red-50 border-l-4 border-red-400 rounded-r text-xs text-red-700">
                <span className="font-semibold">Reason: </span>
                {record.statusMessage.includes('Reason:')
                  ? record.statusMessage.split('Reason:')[1]?.trim()
                  : 'No reason provided.'}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}