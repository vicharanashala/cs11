import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HttpModule } from '@nestjs/axios'
import { Answer, AnswerSchema } from './answer.schema'
import { AnswersService } from './answers.service'
import { AnswersController } from './answers.controller'
import { QuestionsModule } from '../questions/questions.module'
import { FaqsModule } from '../faqs/faqs.module'
import { UsersModule } from '../users/users.module'
import { AdminModule } from '../admin/admin.module'
import { MetaModule } from '../admin/meta.module'
import { EventsModule } from '../events/events.module'
import { ReputationModule } from '../reputation/reputation.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Answer.name, schema: AnswerSchema }]),
    HttpModule,
    forwardRef(() => QuestionsModule),
    FaqsModule,
    UsersModule,
    AdminModule,
    MetaModule,
    EventsModule,
    ReputationModule,
  ],
  providers: [AnswersService],
  controllers: [AnswersController],
  exports: [AnswersService],
})
export class AnswersModule {}