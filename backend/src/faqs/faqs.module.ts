import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { FAQ, FaqSchema } from './faq.schema'
import { FaqsService } from './faqs.service'
import { FaqsController } from './faqs.controller'

@Module({
  imports: [MongooseModule.forFeature([{ name: FAQ.name, schema: FaqSchema }])],
  providers: [FaqsService],
  controllers: [FaqsController],
  exports: [FaqsService],
})
export class FaqsModule {}