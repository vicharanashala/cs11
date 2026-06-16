import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
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

  async findAll(params: {
    page?: number
    limit?: number
    search?: string
  }): Promise<{ data: Partial<User>[]; totalCount: number; page: number }> {
    const { page = 1, limit = 20, search } = params
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), 'i')
      filter.$or = [{ name: re }, { email: re }]
    }

    const [users, totalCount] = await Promise.all([
      this.userModel
        .find(filter, { passwordHash: 0 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ])

    return { data: users as Partial<User>[], totalCount, page }
  }

  async updateRole(userId: string, newRole: string, actorUserId: string): Promise<UserDocument> {
    if (userId === actorUserId) {
      throw new ForbiddenException('Cannot change your own role')
    }

    if (newRole === 'superadmin') {
      throw new BadRequestException('Cannot assign the superadmin role')
    }

    if (newRole !== 'intern' && newRole !== 'admin') {
      throw new BadRequestException('Invalid role')
    }

    const target = await this.userModel.findById(userId).exec()
    if (!target) throw new NotFoundException('User not found')
    if (target.role === 'superadmin') {
      throw new BadRequestException('Cannot change the role of a superadmin')
    }

    const updated = await this.userModel.findByIdAndUpdate(userId, { role: newRole }, { new: true }).exec()
    if (!updated) throw new NotFoundException('User not found')
    return updated
  }

  async deactivate(userId: string, actorUserId: string): Promise<UserDocument> {
    if (userId === actorUserId) {
      throw new ForbiddenException('Cannot deactivate your own account')
    }

    const target = await this.userModel.findById(userId).exec()
    if (!target) throw new NotFoundException('User not found')
    if (target.role === 'superadmin') {
      throw new ForbiddenException('Cannot deactivate a superadmin account')
    }

    const updated = await this.userModel.findByIdAndUpdate(userId, { isActive: false }, { new: true }).exec()
    if (!updated) throw new NotFoundException('User not found')
    return updated
  }

  async reactivate(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(userId, { isActive: true }, { new: true }).exec()
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async updateField(userId: string, field: string, value: any): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(userId, { [field]: value }, { new: true }).exec()
    if (!user) throw new NotFoundException('User not found')
    return user
  }
}