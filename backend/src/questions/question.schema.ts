import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type QuestionDocument = Question & Document

@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true, minlength: 10 })
  title: string

  @Prop({ required: true })
  body: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  askedBy: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId

  @Prop({ type: [String], default: [] })
  tags: string[]

  @Prop({ required: true, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' })
  status: 'open' | 'in_progress' | 'resolved' | 'closed'

  @Prop({ type: Types.ObjectId, ref: 'FAQ' })
  aiMatchFaqId?: Types.ObjectId

  @Prop()
  aiConfidence?: number

  @Prop({ default: 0 })
  upvotes: number

  @Prop({ default: 0 })
  downvotes: number

  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, value: { type: Number, min: -1, max: 1 } }], default: [] })
  votes: { userId: Types.ObjectId; value: number }[]

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Answer' }] })
  answers: Types.ObjectId[]
}

export const QuestionSchema = SchemaFactory.createForClass(Question)

// Virtual for answer count (resolves Issue 1)
QuestionSchema.virtual('answerCount').get(function () {
  return this.answers?.length ?? 0
})