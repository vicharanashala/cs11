import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { DocumentStatus, DocumentStatusDocument, DocumentType, DocumentStatusValue } from './schemas/document-status.schema'

interface StatusRecord {
  documentType: DocumentType
  status: DocumentStatusValue
  statusMessage: string
  completedAt?: string
}

interface DocumentStatusResponse {
  type: 'document_status'
  records: StatusRecord[]
  overallMessage: string
  completionPercentage: number
}

interface NoRecordResponse {
  type: 'no_record'
  message: string
}

export type GetStatusResponse = DocumentStatusResponse | NoRecordResponse

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildMessage(docType: DocumentType, status: DocumentStatusValue, record: DocumentStatus): string {
  switch (docType) {
    case DocumentType.NOC:
      switch (status) {
        case DocumentStatusValue.PENDING:
          return 'Your NOC submission is pending. Please upload your NOC document to proceed.'
        case DocumentStatusValue.UNDER_REVIEW:
          return 'Your NOC has been submitted and is currently under review by the admin team.'
        case DocumentStatusValue.COMPLETED:
          return 'Your NOC has been verified and accepted.'
        case DocumentStatusValue.REJECTED:
          return `Your NOC was rejected. Reason: ${record.rejectionReason ?? 'No reason provided.'}. Please resubmit.`
        case DocumentStatusValue.REQUIRES_RESUBMISSION:
          return `Your NOC requires resubmission. Reason: ${record.rejectionReason ?? 'No reason provided.'}.`
      }

    case DocumentType.OFFER_LETTER_DOWNLOAD:
      switch (status) {
        case DocumentStatusValue.PENDING:
          return 'You have not yet downloaded your offer letter. Please download it from the documents section.'
        case DocumentStatusValue.COMPLETED:
          return `You have successfully downloaded your offer letter on ${formatDate(record.completedAt!)}.`
        default:
          return `Status: ${status}`
      }

    case DocumentType.OFFER_LETTER_ACCEPTANCE:
      switch (status) {
        case DocumentStatusValue.PENDING:
          return 'You have not yet accepted your offer letter. Please review and accept it to confirm your internship.'
        case DocumentStatusValue.UNDER_REVIEW:
          return 'Your offer letter acceptance is being processed by the admin team.'
        case DocumentStatusValue.COMPLETED:
          return `You have accepted your offer letter on ${formatDate(record.completedAt!)}. Your internship is confirmed.`
        case DocumentStatusValue.REJECTED:
          return `Your offer letter acceptance was not processed. Reason: ${record.rejectionReason ?? 'No reason provided.'}. Please contact admin.`
        case DocumentStatusValue.REQUIRES_RESUBMISSION:
          return `Your offer letter acceptance requires resubmission. Reason: ${record.rejectionReason ?? 'No reason provided.'}. Please contact admin.`
      }

    case DocumentType.INTERNSHIP_BEGINNING:
      switch (status) {
        case DocumentStatusValue.PENDING:
          return 'Your internship commencement is pending confirmation.'
        case DocumentStatusValue.COMPLETED:
          return `Your internship has officially begun as of ${formatDate(record.completedAt!)}. Welcome aboard.`
        default:
          return `Status: ${status}`
      }
  }
}

@Injectable()
export class DocumentStatusService {
  constructor(
    @InjectModel(DocumentStatus.name)
    private readonly documentStatusModel: Model<DocumentStatusDocument>,
  ) {}

  async getStatusForStudent(studentId: string): Promise<GetStatusResponse> {
    const records = await this.documentStatusModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .exec()

    if (records.length === 0) {
      return {
        type: 'no_record',
        message:
          'We have no onboarding records for your account. Please contact the admin to initiate your onboarding process.',
      }
    }

    const statusRecords: StatusRecord[] = records.map((record) => ({
      documentType: record.documentType,
      status: record.status,
      statusMessage: buildMessage(record.documentType, record.status, record),
      completedAt: record.completedAt ? formatDate(record.completedAt) : undefined,
    }))

    // Ensure all four document types are represented
    const presentTypes = new Set(statusRecords.map((r) => r.documentType))
    for (const docType of Object.values(DocumentType)) {
      if (!presentTypes.has(docType)) {
        statusRecords.push({
          documentType: docType,
          status: DocumentStatusValue.PENDING,
          statusMessage: buildMessage(docType, DocumentStatusValue.PENDING, null as unknown as DocumentStatus),
        })
      }
    }

    // Sort into consistent document type order
    const docTypeOrder = [
      DocumentType.NOC,
      DocumentType.OFFER_LETTER_DOWNLOAD,
      DocumentType.OFFER_LETTER_ACCEPTANCE,
      DocumentType.INTERNSHIP_BEGINNING,
    ]
    statusRecords.sort((a, b) => docTypeOrder.indexOf(a.documentType) - docTypeOrder.indexOf(b.documentType))

    const completedCount = statusRecords.filter((r) => r.status === DocumentStatusValue.COMPLETED).length

    let overallMessage: string
    if (completedCount === 4) {
      overallMessage = 'All onboarding steps are complete. You are fully confirmed for your internship.'
    } else if (statusRecords.some((r) => r.status === DocumentStatusValue.REJECTED || r.status === DocumentStatusValue.REQUIRES_RESUBMISSION)) {
      overallMessage = 'One or more onboarding steps require your attention. Please review the details below.'
    } else if (completedCount === 0) {
      overallMessage = 'Your onboarding process has not been started. Please complete all four steps.'
    } else {
      overallMessage = `Your onboarding is in progress. ${completedCount} of 4 steps completed.`
    }

    return {
      type: 'document_status',
      records: statusRecords,
      overallMessage,
      completionPercentage: Math.round((completedCount / 4) * 100),
    }
  }
}