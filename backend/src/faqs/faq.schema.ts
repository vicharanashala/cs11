import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type FaqDocument = FAQ & Document

@Schema({ timestamps: true })
export class FAQ {
  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  body: string

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId

  @Prop({ type: [String], default: [] })
  tags: string[]

  @Prop({ required: true, enum: ['draft', 'published', 'archived'], default: 'draft' })
  status: 'draft' | 'published' | 'archived'

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId

  @Prop()
  officialAnswer?: string

  @Prop({ default: 0 })
  upvotes: number

  @Prop({ default: 0 })
  downvotes: number

  @Prop({ default: 0 })
  viewCount: number

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId
}

export const FaqSchema = SchemaFactory.createForClass(FAQ)