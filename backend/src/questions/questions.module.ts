import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HttpModule } from '@nestjs/axios'
import { Question, QuestionSchema } from './question.schema'
import { DocumentStatus, DocumentStatusSchema } from './schemas/document-status.schema'
import { QuestionsService } from './questions.service'
import { QuestionsController } from './questions.controller'
import { AiMatcherService } from './ai-matcher.service'
import { IntentDetectorService } from './intent/intent-detector.service'
import { DocumentStatusService } from './document-status.service'
import { FaqsModule } from '../faqs/faqs.module'
import { AnswersModule } from '../answers/answers.module'
import { AdminModule } from '../admin/admin.module'
import { MetaModule } from '../admin/meta.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: DocumentStatus.name, schema: DocumentStatusSchema },
    ]),
    HttpModule,
    FaqsModule,
    forwardRef(() => AnswersModule),
    AdminModule,
    MetaModule,
  ],
  providers: [
    QuestionsService,
    AiMatcherService,
    IntentDetectorService,
    DocumentStatusService,
  ],
  controllers: [QuestionsController],
  exports: [QuestionsService, DocumentStatusService],
})
export class QuestionsModule {}