import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Question, QuestionDocument } from '../questions/schemas/question.schema'
import { FAQ, FaqDocument } from '../faqs/faq.schema'
import { Category, CategoryDocument } from '../categories/category.schema'

export interface CategoryCoverageItem {
  categoryId: string
  categoryName: string
  categorySlug: string
  totalQuestions: number
  resolvedCount: number
  unresolvedCount: number
  resolutionRate: number
  faqCount: number
  coverageGap: number
  representativeQuery: string
}

export interface CategoryCoverageResponse {
  generatedAt: string
  categories: CategoryCoverageItem[]
}

@Injectable()
export class QueryAnalyticsService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    @InjectModel(FAQ.name) private faqModel: Model<FaqDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async getCategoryCoverage(): Promise<CategoryCoverageResponse> {
    // Step 1 - aggregate Questions grouped by category
    const rawResults = await this.questionModel
      .aggregate([
        {
          $group: {
            _id: '$category',
            totalQuestions: { $sum: 1 },
            resolvedCount: {
              $sum: {
                $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0],
              },
            },
            unresolvedCount: {
              $sum: {
                $cond: [{ $in: ['$status', ['open', 'in_progress']] }, 1, 0],
              },
            },
          },
        },
        // Enrich with category name and slug via $lookup
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: false } },
        // Sort by totalQuestions descending for the initial pass
        { $sort: { totalQuestions: -1 } },
      ])
      .exec()

    if (!rawResults.length) {
      return { generatedAt: new Date().toISOString(), categories: [] }
    }

    // Step 2 - count published FAQs per category
    const faqCounts = await this.faqModel
      .aggregate([
        { $match: { status: 'published' } },
        {
          $group: {
            _id: '$category',
            faqCount: { $sum: 1 },
          },
        },
      ])
      .exec()

    const faqCountMap = new Map<string, number>(
      faqCounts.map((f) => [f._id.toString(), f.faqCount]),
    )

    // Attach faqCount and compute coverageGap
    const withFaqCount = rawResults.map((r) => {
      const catId = r._id.toString()
      const faqCount = faqCountMap.get(catId) ?? 0
      const totalQuestions = r.totalQuestions as number
      // coverageGap = questions per FAQ (lower coverage = higher gap = more underserved)
      const coverageGap = Math.round((totalQuestions / (faqCount + 1)) * 10) / 10
      const resolutionRate =
        totalQuestions > 0
          ? Math.round((r.resolvedCount / totalQuestions) * 1000) / 10
          : 0

      return {
        categoryId: catId,
        categoryName: r.categoryInfo.name,
        categorySlug: r.categoryInfo.slug,
        totalQuestions,
        resolvedCount: r.resolvedCount,
        unresolvedCount: r.unresolvedCount,
        resolutionRate,
        faqCount,
        coverageGap,
      }
    })

    // Step 3 - sort by coverageGap descending (most underserved first)
    withFaqCount.sort((a, b) => b.coverageGap - a.coverageGap)

    // Step 4 - fetch representativeQuery for each category
    const categoriesWithQuery = await Promise.all(
      withFaqCount.map(async (cat) => {
        const representativeQuery = await this.getRepresentativeQuery(cat.categoryId)
        return { ...cat, representativeQuery }
      }),
    )

    return {
      generatedAt: new Date().toISOString(),
      categories: categoriesWithQuery,
    }
  }

  private async getRepresentativeQuery(categoryId: string): Promise<string> {
    // Try most recent unresolved (open or in_progress) first
    const unresolved = await this.questionModel
      .findOne({ category: categoryId as any, status: { $in: ['open', 'in_progress'] } })
      .sort({ createdAt: -1 })
      .select('title')
      .lean()
      .exec()

    if (unresolved) return unresolved.title

    // Fallback: most recent resolved or closed
    const resolved = await this.questionModel
      .findOne({ category: categoryId as any, status: { $in: ['resolved', 'closed'] } })
      .sort({ createdAt: -1 })
      .select('title')
      .lean()
      .exec()

    return resolved?.title ?? ''
  }
}