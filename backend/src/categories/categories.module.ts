import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Category, CategorySchema } from './category.schema'
import { CategoriesService } from './categories.service'
import { CategoriesController } from './categories.controller'
import { FAQ, FaqSchema } from '../faqs/faq.schema'
import { Question, QuestionSchema } from '../questions/schemas/question.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: FAQ.name, schema: FaqSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}