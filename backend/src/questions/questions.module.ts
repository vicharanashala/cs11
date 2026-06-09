import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Question, QuestionSchema } from './schemas/question.schema'
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
import { AiModule } from '../ai/ai.module'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: DocumentStatus.name, schema: DocumentStatusSchema },
    ]),
    FaqsModule,
    forwardRef(() => AnswersModule),
    AdminModule,
    MetaModule,
    forwardRef(() => AiModule),
    EventsModule,
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