import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Question, QuestionDocument } from './question.schema'
import { CreateQuestionDto } from './dtos/create-question.dto'
import { FaqsService } from '../faqs/faqs.service'
import { AiMatcherService } from './ai-matcher.service'

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    private readonly aiMatcher: AiMatcherService,
    private readonly faqsService: FaqsService,
  ) {}

  async create(dto: CreateQuestionDto, userId: string): Promise<{ questionId: string; message: string }> {
    const question = new this.questionModel({
      ...dto,
      askedBy: new Types.ObjectId(userId),
      status: 'open',
    })
    const saved = await question.save()
    return { questionId: saved._id.toString(), message: 'Your question has been submitted to the community.' }
  }

  async findAll(filters: {
    userId?: string
    role?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: QuestionDocument[]; totalCount: number; page: number }> {
    const { userId, role, status, page = 1, limit = 20 } = filters
    const query: Record<string, unknown> = {}

    // intern sees only their own questions; admin+ sees all
    if (role !== 'admin' && role !== 'superadmin') {
      if (userId) {
        query.askedBy = new Types.ObjectId(userId)
      } else {
        query.askedBy = new Types.ObjectId('000000000000000000000000') // impossible ObjectId — returns nothing
      }
    }

    if (status) {
      query.status = status
    }

    const skip = (page - 1) * limit

    const [data, totalCount] = await Promise.all([
      this.questionModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('askedBy', 'name email')
        .populate('category', 'name slug color')
        .exec(),
      this.questionModel.countDocuments(query).exec(),
    ])

    return { data, totalCount, page }
  }

  async findById(id: string): Promise<QuestionDocument> {
    const question = await this.questionModel
      .findById(id)
      .populate('askedBy', 'name email role')
      .populate('category', 'name slug color')
      .exec()

    if (!question) throw new NotFoundException('Question not found')
    return question
  }

  async checkAiMatch(dto: CreateQuestionDto): Promise<{ aiMatch: boolean; faq?: { id: string; title: string; confidence: number } }> {
    const queryText = `${dto.title} ${dto.body}`
    const result = await this.aiMatcher.match(queryText)

    if (!result.matched || !result.faqId) {
      return { aiMatch: false }
    }

    const faq = await this.faqsService.findById(result.faqId)
    return {
      aiMatch: true,
      faq: { id: faq._id.toString(), title: faq.title, confidence: result.confidence ?? 0 },
    }
  }
}