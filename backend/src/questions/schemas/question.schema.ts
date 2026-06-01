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
  status: string

  @Prop({ type: Types.ObjectId, ref: 'FAQ' })
  aiMatchFaqId?: Types.ObjectId

  @Prop({ min: 0, max: 1 })
  aiConfidence?: number

  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, value: { type: Number, enum: [1, -1] } }], default: [] })
  votes: { userId: Types.ObjectId; value: 1 | -1 }[]

  @Prop({ default: 0 })
  upvotes: number

  @Prop({ default: 0 })
  downvotes: number

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Answer' }] })
  answers: Types.ObjectId[]
}

export const QuestionSchema = SchemaFactory.createForClass(Question)

// Virtual for answer count
QuestionSchema.virtual('answerCount').get(function () {
  return this.answers?.length ?? 0
})