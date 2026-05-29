import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type CategoryDocument = Category & Document

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  name: string

  @Prop({ required: true, unique: true })
  slug: string

  @Prop()
  description: string

  @Prop({ required: true })
  color: string

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId
}

export const CategorySchema = SchemaFactory.createForClass(Category)