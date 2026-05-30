import { Injectable } from '@nestjs/common'

export type IntentName = 'document_status_check'

/** Keywords covering all four document types and their natural-language variants */
const DOCUMENT_STATUS_KEYWORDS: string[] = [
  // NOC
  'noc submitted',
  'noc status',
  'noc uploaded',
  'noc approved',
  'noc rejected',
  'is my noc',
  'has my noc',
  'did my noc',
  'no objection certificate',
  'noc done',
  'noc pending',

  // Offer letter — download
  'offer letter downloaded',
  'did i download',
  'have i downloaded',
  'offer letter download',
  'download my offer',
  'downloaded the offer',
  'offer letter status',
  'is my offer letter',
  'has my offer letter',

  // Offer letter — acceptance
  'offer letter accepted',
  'did i accept',
  'have i accepted',
  'accepted the offer',
  'offer acceptance',
  'offer accepted',
  'accept the offer letter',
  'offer letter acceptance status',

  // Internship beginning
  'internship started',
  'internship beginning',
  'internship begin',
  'has my internship',
  'is my internship',
  'internship confirmed',
  'internship commencement',
  'when does my internship',
  'internship start confirmed',
  'joining confirmed',
  'joining status',

  // General fallback phrases (any document type)
  'my document status',
  'onboarding status',
  'my onboarding',
  'document verified',
  'document pending',
  'document submitted',
  'document rejected',
  'my status',
  'what is my status',
  'check my status',
]

/**
 * Normalise a query string for matching:
 * - lowercased
 * - punctuation removed
 * - internal whitespace collapsed to single spaces
 * - trimmed
 */
function normalise(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

@Injectable()
export class IntentDetectorService {
  /**
   * Detect the intent of an incoming query.
   *
   * @param query - The raw question string from the student
   * @returns     The intent name string if matched, or `null` if no intent recognised
   */
  detect(query: string): IntentName | null {
    const cleaned = normalise(query)

    for (const keyword of DOCUMENT_STATUS_KEYWORDS) {
      if (cleaned.includes(keyword)) {
        return 'document_status_check'
      }
    }

    return null
  }
}