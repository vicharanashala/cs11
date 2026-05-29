import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type AnswerDocument = Answer & Document

@Schema({ timestamps: true })
export class Answer {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'FAQ' })
  faqId?: Types.ObjectId

  @Prop({ required: true })
  body: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  contributedBy: Types.ObjectId

  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, value: { type: Number, enum: [1, -1] } }], default: [] })
  votes: { userId: Types.ObjectId; value: 1 | -1 }[]

  @Prop({ default: 0 })
  upvotes: number

  @Prop({ default: 0 })
  downvotes: number

  @Prop({ default: false })
  isAccepted: boolean

  @Prop({ default: false })
  isOfficialAdminAnswer: boolean
}

export const AnswerSchema = SchemaFactory.createForClass(Answer)