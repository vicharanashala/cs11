import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { QuestionsModule } from './questions/questions.module'
import { AnswersModule } from './answers/answers.module'
import { FaqsModule } from './faqs/faqs.module'
import { FlagsModule } from './flags/flags.module'
import { CategoriesModule } from './categories/categories.module'
import { AiModule } from './ai/ai.module'
import { SeedModule } from './seed/seed.module'
import { AdminModule } from './admin/admin.module'
import { EventsModule } from './events/events.module'
import { ReputationModule } from './reputation/reputation.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/crowdfaq'),
    AuthModule,
    UsersModule,
    QuestionsModule,
    AnswersModule,
    FaqsModule,
    FlagsModule,
    CategoriesModule,
    AiModule,
    SeedModule,
    AdminModule,
    EventsModule,
    ReputationModule,
  ],
})
export class AppModule {}