import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { User } from '../../users/schemas/user.schema'

export type DocumentStatusDocument = DocumentStatus & Document

export enum DocumentType {
  NOC = 'noc',
  OFFER_LETTER_DOWNLOAD = 'offer_letter_download',
  OFFER_LETTER_ACCEPTANCE = 'offer_letter_acceptance',
  INTERNSHIP_BEGINNING = 'internship_beginning',
}

export enum DocumentStatusValue {
  PENDING = 'pending',
  COMPLETED = 'completed',
  UNDER_REVIEW = 'under_review',
  REJECTED = 'rejected',
  REQUIRES_RESUBMISSION = 'requires_resubmission',
}

@Schema({ timestamps: true })
export class DocumentStatus {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId

  @Prop({
    type: String,
    required: true,
    enum: Object.values(DocumentType),
  })
  documentType: DocumentType

  @Prop({
    type: String,
    enum: Object.values(DocumentStatusValue),
    default: DocumentStatusValue.PENDING,
  })
  status: DocumentStatusValue

  @Prop({ type: Date })
  completedAt?: Date

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId

  @Prop({ type: String })
  rejectionReason?: string
}

export const DocumentStatusSchema = SchemaFactory.createForClass(DocumentStatus)

/** Compound unique index — one record per student per document type */
DocumentStatusSchema.index(
  { studentId: 1, documentType: 1 },
  { unique: true, name: 'student_document_type_unique' },
)