import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type UserDocument = User & Document

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, minlength: 2 })
  name: string

  @Prop({ required: true, unique: true })
  email: string

  @Prop({ required: true })
  passwordHash: string

  @Prop({ required: true, enum: ['intern', 'admin', 'superadmin'], default: 'intern' })
  role: 'intern' | 'admin' | 'superadmin'

  @Prop({ default: 0 })
  reputation: number

  @Prop({ default: true })
  isFirstTimeIntern: boolean
}

export const UserSchema = SchemaFactory.createForClass(User)