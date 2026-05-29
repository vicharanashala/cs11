import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HttpModule } from '@nestjs/axios'
import { Question, QuestionSchema } from './question.schema'
import { QuestionsService } from './questions.service'
import { QuestionsController } from './questions.controller'
import { AiMatcherService } from './ai-matcher.service'
import { FaqsModule } from '../faqs/faqs.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }]),
    HttpModule,
    FaqsModule,
  ],
  providers: [QuestionsService, AiMatcherService],
  controllers: [QuestionsController],
  exports: [QuestionsService],
})
export class QuestionsModule {}