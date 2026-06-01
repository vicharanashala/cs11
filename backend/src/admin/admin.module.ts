import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HttpModule } from '@nestjs/axios'
import { Question, QuestionSchema } from '../questions/schemas/question.schema'
import { Answer, AnswerSchema } from '../answers/answer.schema'
import { FAQ, FaqSchema } from '../faqs/faq.schema'
import { User, UserSchema } from '../users/schemas/user.schema'
import { Category, CategorySchema } from '../categories/category.schema'
import { AdminService } from './admin.service'
import { AdminController } from './admin.controller'
import { AnalyticsService } from './analytics.service'
import { MetaModule } from './meta.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: Answer.name, schema: AnswerSchema },
      { name: FAQ.name, schema: FaqSchema },
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    HttpModule,
    MetaModule,
  ],
  providers: [AdminService, AnalyticsService],
  controllers: [AdminController],
  exports: [AdminService, AnalyticsService],
})
export class AdminModule {}