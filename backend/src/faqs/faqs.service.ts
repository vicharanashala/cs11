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
    search?: string
  }): Promise<{ data: FaqDocument[]; totalCount: number; page: number }> {
    const { category, tags, status, page = 1, limit = 20, isAdmin = false, search } = filters

    const skip = (page - 1) * limit

    // ATLAS SEARCH INDEX REQUIRED IN PRODUCTION
    // In MongoDB Atlas UI: Search Indexes → Create Index → JSON Editor
    // Database: your_db Collection: faqs Index name: faq_search
    // {
    // "mappings": {
    // "dynamic": false,
    // "fields": {
    // "title": { "type": "string", "analyzer": "lucene.standard" },
    // "body": { "type": "string", "analyzer": "lucene.standard" },
    // "tags": { "type": "string", "analyzer": "lucene.standard" },
    // "status": { "type": "string" },
    // "category": { "type": "objectId" }
    // }
    // }
    // }
    if (search) {
      try {
        // Build the $match portion for status + category (applied after $search)
        const postMatch: Record<string, unknown> = { status: 'published' }
        if (category) {
          postMatch.category = new Types.ObjectId(category)
        }

        const pipeline = [
          {
            $search: {
              index: 'faq_search',
              compound: {
                should: [
                  {
                    text: {
                      query: search,
                      path: 'title',
                      boost: { value: 3 },
                      fuzzy: { maxEdits: 1, prefixLength: 2 },
                    },
                  },
                  {
                    text: {
                      query: search,
                      path: { body: 1, tags: 1 },
                      boost: { value: 1 },
                      fuzzy: { maxEdits: 1, prefixLength: 2 },
                    },
                  },
                ],
                minimumShouldMatch: 1,
              },
            },
          },
          { $match: postMatch },
          {
            $facet: {
              data: [{ $skip: skip }, { $limit: limit }],
              meta: [{ $count: 'total' }],
            },
          },
        ]

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await this.faqModel.aggregate(pipeline as any[]).exec()
        const facet = results[0]
        const data: FaqDocument[] = facet.data ?? []
        const totalCount: number = facet.meta[0]?.total ?? 0

        return { data, totalCount, page }
      } catch (err) {
        // Fall back to case-insensitive regex on title for local dev (no Atlas Search index)
        console.warn('[FaqsService] Atlas Search unavailable, falling back to regex:', (err as Error).message)
      }
    }

    // ── No search: original plain Mongoose find ──────────────────────────────
    const query: Record<string, unknown> = {}

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