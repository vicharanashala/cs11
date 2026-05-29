import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'
import { Model } from 'mongoose'
import { FAQ, FaqDocument } from '../faqs/faq.schema'
import { Question, QuestionDocument } from '../questions/question.schema'
import { Answer, AnswerDocument } from '../answers/answer.schema'
import { User, UserDocument } from '../users/schemas/user.schema'
import { Category, CategoryDocument } from '../categories/category.schema'
import { MetaService } from './meta.service'

export interface QuestionStatusCounts {
  open: number
  in_progress: number
  resolved: number
  closed: number
}

export interface CategoryBreakdownItem {
  _id: string
  name: string
  count: number
}

export interface TopContributor {
  name: string
  reputation: number
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(FAQ.name) private faqModel: Model<FaqDocument>,
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    @InjectModel(Answer.name) private answerModel: Model<AnswerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectConnection() private connection: Connection,
    private readonly metaService: MetaService,
  ) {}

  async getAnalytics(): Promise<{
    totalFaqs: number
    totalQuestions: QuestionStatusCounts
    totalAnswers: number
    avgResolutionTimeHours: number | null
    topContributors: TopContributor[]
    categoryBreakdown: CategoryBreakdownItem[]
    aiMatchRate: number
    indexStalenessHours: number | null
  }> {
    const [
      totalFaqs,
      questionStatusCounts,
      totalAnswers,
      avgResolutionTimeHours,
      topContributors,
      categoryBreakdown,
      totalQuestionsCount,
      aiMatchedCount,
      lastIndexRebuild,
    ] = await Promise.all([
      // 1. Total published FAQs
      this.faqModel.countDocuments({ status: 'published' }).exec(),

      // 2. Questions grouped by status
      this.questionModel
        .aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),

      // 3. Total community answers (exclude official admin answers)
      this.answerModel.countDocuments({ isOfficialAdminAnswer: false }).exec(),

      // 4. Avg resolution time — MongoDB aggregation
      this.questionModel
        .aggregate([
          {
            $match: {
              status: 'resolved',
              createdAt: { $exists: true },
              updatedAt: { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              avgMs: {
                $avg: { $subtract: [{ $toDate: '$updatedAt' }, { $toDate: '$createdAt' }] },
              },
            },
          },
        ])
        .exec(),

      // 5. Top 5 contributors by reputation
      this.userModel
        .find({}, { name: 1, reputation: 1 })
        .sort({ reputation: -1 })
        .limit(5)
        .lean()
        .exec(),

      // 6. FAQ count per category
      this.faqModel
        .aggregate([
          { $match: { status: 'published' } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          {
            $lookup: {
              from: 'categories',
              localField: '_id',
              foreignField: '_id',
              as: 'categoryInfo',
            },
          },
          { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: { $toString: '$_id' },
              name: { $ifNull: ['$categoryInfo.name', 'Unknown'] },
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ])
        .exec(),

      // 7. Total questions for aiMatchRate denominator
      this.questionModel.countDocuments().exec(),

      // 8. Questions with AI match for numerator
      this.questionModel
        .countDocuments({ aiMatchFaqId: { $ne: null } })
        .exec(),

      // 9. Last index rebuild timestamp
      this.metaService.getLastRebuild(),
    ])

    // Build status counts object
    const statusMap: QuestionStatusCounts = { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    for (const entry of questionStatusCounts) {
      if (entry._id in statusMap) {
        statusMap[entry._id as keyof QuestionStatusCounts] = entry.count
      }
    }

    // avgResolutionTimeHours — convert ms average to hours
    const avgMs = avgResolutionTimeHours[0]?.avgMs ?? null
    const avgHours = avgMs !== null ? Math.round((avgMs / (1000 * 60 * 60)) * 100) / 100 : null

    // aiMatchRate — percentage
    const aiMatchRate = totalQuestionsCount > 0
      ? Math.round((aiMatchedCount / totalQuestionsCount) * 10000) / 100
      : 0

    // Index staleness in hours
    const indexStalenessHours = lastIndexRebuild
      ? Math.round(((Date.now() - lastIndexRebuild.getTime()) / (1000 * 60 * 60)) * 100) / 100
      : null

    return {
      totalFaqs,
      totalQuestions: statusMap,
      totalAnswers,
      avgResolutionTimeHours: avgHours,
      topContributors: topContributors.map((u) => ({ name: u.name, reputation: u.reputation })),
      categoryBreakdown,
      aiMatchRate,
      indexStalenessHours,
    }
  }
}