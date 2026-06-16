import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Question, QuestionDocument } from './schemas/question.schema'
import { CreateQuestionDto } from './dtos/create-question.dto'
import { VoteQuestionDto } from './dtos/vote-question.dto'
import { FaqsService } from '../faqs/faqs.service'
import { AiMatcherService } from './ai-matcher.service'
import { IntentDetectorService } from './intent/intent-detector.service'
import { DocumentStatusService } from './document-status.service'
import { EmbeddingsService } from '../ai/embeddings.service'
import { EventsGateway } from '../events/events.gateway'

export type AskResponse =
  | { questionId: string; message: string }
  | { aiMatch: true; faq: { id: string; title: string; confidence: number } }
  | { intentMatch: true; intentType: 'document_status_check'; statusResponse: Awaited<ReturnType<DocumentStatusService['getStatusForStudent']>> }

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name)

  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    private readonly aiMatcher: AiMatcherService,
    private readonly faqsService: FaqsService,
    private readonly intentDetector: IntentDetectorService,
    private readonly documentStatus: DocumentStatusService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly events: EventsGateway,
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

  async create(dto: CreateQuestionDto, userId: string, aiMatchFaqId?: string): Promise<{ questionId: string; message: string }> {
    const question = new this.questionModel({
      title: dto.title,
      body: dto.body,
      tags: dto.tags ?? [],
      askedBy: new Types.ObjectId(userId),
      category: dto.category ? new Types.ObjectId(dto.category) : undefined,
      aiMatchFaqId: aiMatchFaqId ? new Types.ObjectId(aiMatchFaqId) : undefined,
      status: 'open',
    })
    const saved = await question.save()

    // Embed the question for future "similar questions" lookups (fire-and-forget)
    const queryText = `${dto.title} ${dto.body}`
    this.embeddingsService.generateEmbedding(queryText).then((embedding) => {
      if (!embedding || embedding.length === 0) return
      this.questionModel.findByIdAndUpdate(saved._id, { questionEmbedding: embedding }).catch((err) => {
        this.logger.warn(`Failed to persist question embedding for ${saved._id}: ${err.message}`)
      })
    }).catch((err) => {
      this.logger.warn(`Failed to generate question embedding for ${saved._id}: ${err.message}`)
    })

    return { questionId: saved._id.toString(), message: 'Your question has been submitted to the community.' }
  }

  async findAll(filters: {
    userId?: string
    role?: string
    status?: string
    search?: string
    category?: string
    page?: number
    limit?: number
  }): Promise<{ data: QuestionDocument[]; totalCount: number; page: number }> {
    const { userId, role, status, search, category, page = 1, limit = 20 } = filters
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

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
      ]
    }

    if (category) {
      // category param is a category slug; match against the populated category document's slug
      query['category.slug'] = category
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

  async vote(questionId: string, voterId: string, dto: VoteQuestionDto): Promise<{ action: string; upvotes: number; downvotes: number }> {
    const voterOid = new Types.ObjectId(voterId)
    const newValue: 1 | -1 = dto.value

    const question = await this.questionModel.findById(questionId).exec()
    if (!question) throw new NotFoundException('Question not found')

    // Prevent self-voting
    if (question.askedBy.toString() === voterId) {
      throw new BadRequestException('Cannot vote on your own question.')
    }

    const existing = question.votes.find((v) => v.userId.toString() === voterId)

    if (existing) {
      if (existing.value === newValue) {
        // Same direction — remove vote (toggle off)
        question.votes = question.votes.filter((v) => v.userId.toString() !== voterId)
        if (newValue === 1) question.upvotes -= 1
        else question.downvotes -= 1
        await question.save()
        const result = { action: 'removed', upvotes: question.upvotes, downvotes: question.downvotes }
        this.events.emitVoteUpdated(questionId, 'question', result.upvotes, result.downvotes)
        return result
      } else {
        // Opposite direction — flip vote
        existing.value = newValue
        if (newValue === 1) { question.upvotes += 1; question.downvotes -= 1 }
        else { question.downvotes += 1; question.upvotes -= 1 }
        await question.save()
        const result = { action: 'flipped', upvotes: question.upvotes, downvotes: question.downvotes }
        this.events.emitVoteUpdated(questionId, 'question', result.upvotes, result.downvotes)
        return result
      }
    } else {
      // New vote
      question.votes.push({ userId: voterOid, value: newValue })
      if (newValue === 1) question.upvotes += 1
      else question.downvotes += 1
      await question.save()
      const result = { action: 'added', upvotes: question.upvotes, downvotes: question.downvotes }
      this.events.emitVoteUpdated(questionId, 'question', result.upvotes, result.downvotes)
      return result
    }
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