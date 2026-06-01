import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { InjectConnection } from '@nestjs/mongoose'
import { Model, Types, Connection } from 'mongoose'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { Question, QuestionDocument } from '../questions/schemas/question.schema'
import { Answer, AnswerDocument } from '../answers/answer.schema'
import { FAQ, FaqDocument } from '../faqs/faq.schema'
import { MetaService } from './meta.service'

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    @InjectModel(Answer.name) private answerModel: Model<AnswerDocument>,
    @InjectModel(FAQ.name) private faqModel: Model<FaqDocument>,
    @InjectConnection() private connection: Connection,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly metaService: MetaService,
  ) {}

  async getQueryQueue(filters: {
    page?: number
    limit?: number
  }): Promise<{ data: Record<string, unknown>[]; totalCount: number; page: number }> {
    const { page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const query = { status: { $in: ['open', 'in_progress'] } }

    const [raw, totalCount] = await Promise.all([
      this.questionModel
        .aggregate([
          { $match: query },
          { $sort: { createdAt: 1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'askedBy',
              foreignField: '_id',
              as: 'askedByUser',
            },
          },
          { $unwind: { path: '$askedByUser', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'answers',
              localField: '_id',
              foreignField: 'questionId',
              as: 'answerDocs',
            },
          },
          {
            $project: {
              questionId: { $toString: '$_id' },
              title: 1,
              'askedBy.name': '$askedByUser.name',
              createdAt: 1,
              answerCount: { $size: '$answerDocs' },
            },
          },
        ])
        .exec(),
      this.questionModel.countDocuments(query).exec(),
    ])

    return { data: raw, totalCount, page }
  }

  async resolveQuestion(
    questionId: string,
    dto: { responseBody: string },
    adminUserId: string,
  ): Promise<{ questionId: string; answerId: string }> {
    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      const questionOid = new Types.ObjectId(questionId)
      const adminOid = new Types.ObjectId(adminUserId)

      // 1. Create official admin answer
      const answer = new this.answerModel({
        questionId: questionOid,
        body: dto.responseBody,
        contributedBy: adminOid,
        isOfficialAdminAnswer: true,
        isAccepted: true,
      })
      const savedAnswer = await answer.save({ session })

      // 2. Push answer ref into question's answers array
      await this.connection
        .collection('questions')
        .updateOne({ _id: questionOid }, { $push: { answers: savedAnswer._id } as any, $set: { status: 'resolved', resolvedBy: adminOid } }, { session })

      // 3. Increment admin reputation by +5
      await this.connection
        .collection('users')
        .updateOne({ _id: adminOid }, { $inc: { reputation: 5 } }, { session })

      await session.commitTransaction()

      return { questionId, answerId: savedAnswer._id.toString() }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  async rebuildIndex(): Promise<{ rebuilt: boolean; count: number }> {
    const faqs = await this.faqModel
      .find({ status: 'published' }, { _id: 1, title: 1, body: 1, tags: 1 })
      .lean()
      .exec()

    const aiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
    try {
      await this.httpService.axiosRef.post(`${aiUrl}/rebuild-index`, { faqs })
    } catch (error) {
      this.logger.warn(`AI rebuild-index failed: ${(error as Error).message}`)
      // Don't throw — still return count, but don't update rebuild timestamp on failure
      return { rebuilt: false, count: faqs.length }
    }

    // Stamp successful rebuild — only updated when AI call succeeds
    await this.metaService.setLastRebuild()

    return { rebuilt: true, count: faqs.length }
  }
}