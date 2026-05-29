import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type AnswerDocument = Answer & Document

@Schema({ timestamps: true })
export class Answer {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'FAQ' })
  faqId?: Types.ObjectId

  @Prop({ required: true, minlength: 20 })
  body: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  contributedBy: Types.ObjectId

  @Prop({ default: 0 })
  upvotes: number

  @Prop({ default: 0 })
  downvotes: number

  @Prop({ default: false })
  isAccepted: boolean

  @Prop({ default: false })
  isOfficialAdminAnswer: boolean

  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, value: { type: Number, min: -1, max: 1 } }], default: [] })
  votes: { userId: Types.ObjectId; value: number }[]
}

export const AnswerSchema = SchemaFactory.createForClass(Answer)