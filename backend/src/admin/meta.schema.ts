import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type MetaDocument = Meta & Document

@Schema({ timestamps: false, versionKey: false })
export class Meta {
  @Prop({ required: true, unique: true })
  key!: string

  @Prop()
  lastIndexRebuild!: Date
}

export const MetaSchema = SchemaFactory.createForClass(Meta)