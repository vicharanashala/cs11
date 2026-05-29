import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Flag, FlagDocument } from './schemas/flag.schema'

@Injectable()
export class FlagsService {
  constructor(@InjectModel(Flag.name) private flagModel: Model<FlagDocument>) {}

  async create(reporterId: string, dto: { targetId: string; targetType: 'faq' | 'question' | 'answer'; reason: string }): Promise<FlagDocument> {
    // Prevent duplicate reports by same user on same target
    const existing = await this.flagModel.findOne({
      reporter: new Types.ObjectId(reporterId),
      targetId: dto.targetId,
      targetType: dto.targetType,
    }).exec()

    if (existing) {
      throw new ConflictException('You have already reported this content')
    }

    const flag = new this.flagModel({
      reporter: new Types.ObjectId(reporterId),
      targetId: dto.targetId,
      targetType: dto.targetType,
      reason: dto.reason,
    })
    return flag.save()
  }

  async findAll(filters?: { status?: string; reporter?: string; page?: number; limit?: number }): Promise<{ data: FlagDocument[]; total: number }> {
    const query: Record<string, unknown> = {}
    if (filters?.status) query.status = filters.status
    if (filters?.reporter) query.reporter = new Types.ObjectId(filters.reporter)

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.flagModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).populate('reporter', 'name email').exec(),
      this.flagModel.countDocuments(query).exec(),
    ])

    return { data, total }
  }

  async review(flagId: string, reviewerId: string, action: string, note?: string): Promise<FlagDocument> {
    const flag = await this.flagModel.findById(flagId).exec()
    if (!flag) throw new NotFoundException('Flag not found')

    flag.status = 'reviewed'
    flag.reviewHistory.push({
      reviewedBy: new Types.ObjectId(reviewerId),
      action,
      note,
      timestamp: new Date(),
    })
    return flag.save()
  }

  async resolve(flagId: string, reviewerId: string, note?: string): Promise<FlagDocument> {
    const flag = await this.flagModel.findById(flagId).exec()
    if (!flag) throw new NotFoundException('Flag not found')

    flag.status = 'resolved'
    flag.reviewHistory.push({
      reviewedBy: new Types.ObjectId(reviewerId),
      action: 'resolved',
      note,
      timestamp: new Date(),
    })
    return flag.save()
  }

  async dismiss(flagId: string, reviewerId: string, note?: string): Promise<FlagDocument> {
    const flag = await this.flagModel.findById(flagId).exec()
    if (!flag) throw new NotFoundException('Flag not found')

    flag.status = 'dismissed'
    flag.reviewHistory.push({
      reviewedBy: new Types.ObjectId(reviewerId),
      action: 'dismissed',
      note,
      timestamp: new Date(),
    })
    return flag.save()
  }
}