import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Category, CategoryDocument } from './category.schema'
import { FAQ, FaqDocument } from '../faqs/faq.schema'
import { Question, QuestionDocument } from '../questions/schemas/question.schema'

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(FAQ.name) private faqModel: Model<FaqDocument>,
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async create(dto: { name: string; slug?: string; description?: string; color: string }, userId: string): Promise<CategoryDocument> {
    const slug = dto.slug ?? this.slugify(dto.name)

    const [byName, bySlug] = await Promise.all([
      this.categoryModel.findOne({ name: dto.name }).select('_id').lean().exec(),
      this.categoryModel.findOne({ slug }).select('_id').lean().exec(),
    ])
    if (byName) throw new ConflictException(`Category "${dto.name}" already exists`)
    if (bySlug) throw new ConflictException(`Category slug "${slug}" is already taken`)

    const category = new this.categoryModel({
      name: dto.name,
      slug,
      description: dto.description,
      color: dto.color,
      createdBy: new Types.ObjectId(userId),
    })
    return category.save()
  }

  async findAll(): Promise<(CategoryDocument & { faqCount?: number })[]> {
    return this.categoryModel
      .aggregate([
        {
          $lookup: {
            from: 'faqs',
            localField: '_id',
            foreignField: 'category',
            as: 'faqs',
          },
        },
        {
          $addFields: {
            faqCount: {
              $size: {
                $filter: {
                  input: '$faqs',
                  as: 'faq',
                  cond: { $eq: ['$$faq.status', 'published'] },
                },
              },
            },
          },
        },
        {
          $project: { faqs: 0 },
        },
        { $sort: { name: 1 } },
      ])
      .exec()
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).populate('createdBy', 'name email').exec()
    if (!category) throw new NotFoundException('Category not found')
    return category
  }

  async update(id: string, dto: { name?: string; description?: string; color?: string }): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec()
    if (!category) throw new NotFoundException('Category not found')

    if (dto.name !== undefined) category.name = dto.name
    if (dto.description !== undefined) category.description = dto.description
    if (dto.color !== undefined) category.color = dto.color

    return category.save()
  }

  async delete(id: string): Promise<void> {
    const category = await this.categoryModel.findById(id).exec()
    if (!category) throw new NotFoundException('Category not found')

    const inUse = await this.isUsedByActiveContent(id)
    if (inUse) {
      throw new ConflictException('Cannot delete: this category is used by active FAQs or questions.')
    }

    await this.categoryModel.deleteOne({ _id: id }).exec()
  }

  private async isUsedByActiveContent(categoryId: string): Promise<boolean> {
    const categoryOid = new Types.ObjectId(categoryId)

    const [publishedFaq, openQuestion] = await Promise.all([
      this.faqModel.findOne({ category: categoryOid, status: 'published' }).select('_id').lean().exec(),
      this.questionModel.findOne({ category: categoryOid, status: { $in: ['open', 'in_progress'] } }).select('_id').lean().exec(),
    ])

    return !!(publishedFaq || openQuestion)
  }
}