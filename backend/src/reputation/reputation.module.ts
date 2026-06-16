import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ReputationService } from './reputation.service'
import { ReputationEvent, ReputationEventSchema } from './schemas/reputation-event.schema'
import { User, UserSchema } from '../users/schemas/user.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReputationEvent.name, schema: ReputationEventSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}