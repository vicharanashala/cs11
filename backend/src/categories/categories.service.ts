import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Category, CategoryDocument } from './category.schema'

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async create(dto: { name: string; description?: string; color: string }, userId: string): Promise<CategoryDocument> {
    const existing = await this.categoryModel.findOne({ name: dto.name }).exec()
    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`)
    }

    const slug = this.slugify(dto.name)

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
}