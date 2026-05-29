import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Flag, FlagSchema } from './schemas/flag.schema'
import { FlagsService } from './flags.service'
import { FlagsController } from './flags.controller'

@Module({
  imports: [MongooseModule.forFeature([{ name: Flag.name, schema: FlagSchema }])],
  providers: [FlagsService],
  controllers: [FlagsController],
  exports: [FlagsService],
})
export class FlagsModule {}