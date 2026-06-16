import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types, Schema as MongooseSchema } from 'mongoose'

export type ReputationEventDocument = ReputationEvent & Document

export type ReputationEventName =
  | 'answer_upvoted'
  | 'answer_downvote_reversed'
  | 'answer_accepted'
  | 'question_answered'
  | 'faq_contributed'
  | 'answer_downvoted'

@Schema({ timestamps: true })
export class ReputationEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId

  @Prop({
    required: true,
    enum: [
      'answer_upvoted',
      'answer_downvote_reversed',
      'answer_accepted',
      'question_answered',
      'faq_contributed',
      'answer_downvoted',
    ],
  })
  event: ReputationEventName

  @Prop({ required: true })
  points: number

  @Prop({ type: MongooseSchema.Types.ObjectId, refPath: 'targetModel' })
  targetId: Types.ObjectId

  @Prop({ enum: ['Answer', 'Question', 'FAQ'] })
  targetModel: 'Answer' | 'Question' | 'FAQ'

  @Prop()
  description: string
}

export const ReputationEventSchema = SchemaFactory.createForClass(ReputationEvent)

// Efficient per-user history pagination
ReputationEventSchema.index({ userId: 1, createdAt: -1 })