// User & Auth
export type UserRole = 'intern' | 'admin' | 'superadmin'

export interface User {
  _id: string
  name: string
  email: string
  role: UserRole
  reputation: number
  createdAt: string
  updatedAt: string
}

export interface AuthPayload {
  userId: string
  email: string
  role: UserRole
}

// FAQ
export type FaqStatus = 'draft' | 'published' | 'archived'

export interface Vote {
  userId: string
  value: 1 | -1
}

export interface FAQ {
  _id: string
  title: string
  body: string
  category: string
  tags: string[]
  status: FaqStatus
  author: string | User
  officialAnswer?: string
  votes: Vote[]
  upvotes: number
  downvotes: number
  viewCount: number
  resolvedBy?: string | User
  createdAt: string
  updatedAt: string
}

// Question
export type QuestionStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Question {
  _id: string
  title: string
  body: string
  askedBy: string | User
  category: string
  tags: string[]
  status: QuestionStatus
  aiMatchFaqId?: string | FAQ
  aiConfidence?: number
  votes: Vote[]
  upvotes: number
  downvotes: number
  createdAt: string
  updatedAt: string
}

// Answer
export interface Answer {
  _id: string
  questionId: string | Question
  faqId?: string | FAQ
  body: string
  contributedBy: string | User
  votes: Vote[]
  upvotes: number
  downvotes: number
  isAccepted: boolean
  isOfficialAdminAnswer: boolean
  createdAt: string
  updatedAt: string
}

// Flag
export type FlagStatus = 'pending' | 'reviewed' | 'dismissed' | 'resolved'

export interface FlagReviewEntry {
  reviewedBy: string | User
  action: string
  note?: string
  timestamp: string
}

export interface Flag {
  _id: string
  reporter: string | User
  targetId: string
  targetType: 'faq' | 'question' | 'answer'
  reason: string
  status: FlagStatus
  reviewHistory: FlagReviewEntry[]
  createdAt: string
  updatedAt: string
}

// Document Status (internship pipeline)
export type DocumentType = 'noc' | 'offer_letter_download' | 'offer_letter_acceptance' | 'internship_beginning'
export type DocumentStatusValue = 'pending' | 'completed' | 'under_review' | 'rejected' | 'requires_resubmission'

export interface StatusRecord {
  documentType: DocumentType
  status: DocumentStatusValue
  statusMessage: string
  completedAt?: string
}

export interface StatusResponse {
  type: 'document_status'
  records: StatusRecord[]
  overallMessage: string
  completionPercentage: number
}

// Category
export interface Category {
  _id: string
  name: string
  slug: string
  description: string
  color: string
  createdBy: string | User
  createdAt: string
}

// AI Match
export interface AIMatch {
  id: string
  type: 'faq' | 'question'
  confidence: number
  ranking: number
  explanation?: string
}

export interface AIMatchResponse {
  matches: AIMatch[]
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// Admin query-insights (Chunk 13)
export interface CategoryCoverageItem {
  categoryId: string
  categoryName: string
  categorySlug: string
  totalQuestions: number
  resolvedCount: number
  unresolvedCount: number
  resolutionRate: number
  faqCount: number
  coverageGap: number
  representativeQuery: string
}

export interface CategoryCoverageResponse {
  generatedAt: string
  categories: CategoryCoverageItem[]
}