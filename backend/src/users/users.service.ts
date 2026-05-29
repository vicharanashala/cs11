import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from './schemas/user.schema'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec()
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec()
  }

  async create(data: Partial<User> & { email: string; name: string; password: string }): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = new this.userModel({
      ...data,
      passwordHash,
    })
    return user.save()
  }

  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash)
  }

  async updateRole(userId: string, role: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(userId, { role }, { new: true }).exec()
    if (!user) throw new NotFoundException('User not found')
    return user
  }
}