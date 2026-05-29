import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type FlagDocument = Flag & Document

@Schema({ timestamps: true })
export class Flag {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporter: Types.ObjectId

  @Prop({ required: true })
  targetId: string

  @Prop({ required: true, enum: ['faq', 'question', 'answer'] })
  targetType: 'faq' | 'question' | 'answer'

  @Prop({ required: true })
  reason: string

  @Prop({ required: true, enum: ['pending', 'reviewed', 'dismissed', 'resolved'], default: 'pending' })
  status: string

  @Prop({
    type: [
      {
        reviewedBy: { type: Types.ObjectId, ref: 'User' },
        action: String,
        note: String,
        timestamp: Date,
      },
    ],
    default: [],
  })
  reviewHistory: { reviewedBy: Types.ObjectId; action: string; note?: string; timestamp: Date }[]
}

export const FlagSchema = SchemaFactory.createForClass(Flag)