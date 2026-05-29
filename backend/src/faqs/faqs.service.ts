import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { FAQ, FaqDocument } from './faq.schema'
import { CreateFaqDto } from './dtos/create-faq.dto'
import { UpdateFaqDto } from './dtos/update-faq.dto'

@Injectable()
export class FaqsService {
  constructor(@InjectModel(FAQ.name) private faqModel: Model<FaqDocument>) {}

  async create(dto: CreateFaqDto, authorId: string): Promise<FaqDocument> {
    const faq = new this.faqModel({
      ...dto,
      author: new Types.ObjectId(authorId),
      status: 'published',
    })
    return faq.save()
  }

  async findAll(filters: {
    category?: string
    tags?: string[]
    status?: string
    page?: number
    limit?: number
    isAdmin?: boolean
  }): Promise<{ data: FaqDocument[]; totalCount: number; page: number }> {
    const { category, tags, status, page = 1, limit = 20, isAdmin = false } = filters

    const query: Record<string, unknown> = {}

    // Admins: default to published unless explicit status filter is passed
    // Non-admins: always published
    if (status) {
      query.status = status
    } else if (!isAdmin) {
      query.status = 'published'
    } else {
      query.status = 'published'
    }

    if (category) {
      query.category = new Types.ObjectId(category)
    }

    if (tags && tags.length > 0) {
      query.tags = { $all: tags }
    }

    const skip = (page - 1) * limit

    const [data, totalCount] = await Promise.all([
      this.faqModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('author', 'name email role')
        .populate('category', 'name slug color')
        .populate('resolvedBy', 'name email')
        .exec(),
      this.faqModel.countDocuments(query).exec(),
    ])

    return { data, totalCount, page }
  }

  async findById(id: string): Promise<FaqDocument> {
    const faq = await this.faqModel
      .findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })
      .populate('author', 'name email role')
      .populate('category', 'name slug color')
      .populate('resolvedBy', 'name email')
      .exec()

    if (!faq) throw new NotFoundException('FAQ not found')
    return faq
  }

  async update(id: string, dto: UpdateFaqDto): Promise<FaqDocument> {
    const faq = await this.faqModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('author', 'name email role')
      .populate('category', 'name slug color')
      .populate('resolvedBy', 'name email')
      .exec()

    if (!faq) throw new NotFoundException('FAQ not found')
    return faq
  }

  async archive(id: string): Promise<FaqDocument> {
    const faq = await this.faqModel
      .findByIdAndUpdate(id, { $set: { status: 'archived' } }, { new: true })
      .populate('author', 'name email role')
      .populate('category', 'name slug color')
      .exec()

    if (!faq) throw new NotFoundException('FAQ not found')
    return faq
  }
}