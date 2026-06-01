import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Question, QuestionDocument } from './schemas/question.schema'
import { CreateQuestionDto } from './dtos/create-question.dto'
import { FaqsService } from '../faqs/faqs.service'
import { AiMatcherService } from './ai-matcher.service'
import { IntentDetectorService } from './intent/intent-detector.service'
import { DocumentStatusService } from './document-status.service'

export type AskResponse =
  | { questionId: string; message: string }
  | { aiMatch: true; faq: { id: string; title: string; confidence: number } }
  | { intentMatch: true; intentType: 'document_status_check'; statusResponse: Awaited<ReturnType<DocumentStatusService['getStatusForStudent']>> }

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    private readonly aiMatcher: AiMatcherService,
    private readonly faqsService: FaqsService,
    private readonly intentDetector: IntentDetectorService,
    private readonly documentStatus: DocumentStatusService,
  ) {}

  /**
   * Top-level intent + AI match check.
   * Returns early with an intent response, an AI-match response,
   * or falls through so the caller can save to MongoDB.
   */
  async checkIntentAndMatch(
    dto: CreateQuestionDto,
    userId: string,
  ): Promise<AskResponse | null> {
    const queryText = `${dto.title} ${dto.body}`

    // 1. Intent detection — highest priority
    const intent = this.intentDetector.detect(queryText)
    if (intent === 'document_status_check') {
      const statusResponse = await this.documentStatus.getStatusForStudent(userId)
      return { intentMatch: true, intentType: 'document_status_check', statusResponse }
    }

    // 2. AI / FAQ match
    const match = await this.aiMatcher.match(queryText)
    if (match.matched && match.faqId) {
      const faq = await this.faqsService.findById(match.faqId)
      return { aiMatch: true, faq: { id: faq._id.toString(), title: faq.title, confidence: match.confidence ?? 0 } }
    }

    // 3. No intent, no match — caller should save to MongoDB
    return null
  }

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
        // impossible ObjectId — returns nothing
        query.askedBy = new Types.ObjectId('000000000000000000000000')
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