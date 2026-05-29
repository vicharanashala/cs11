import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Meta, MetaSchema } from './meta.schema'
import { MetaService } from './meta.service'

@Module({
  imports: [MongooseModule.forFeature([{ name: Meta.name, schema: MetaSchema }])],
  providers: [MetaService],
  exports: [MetaService],
})
export class MetaModule {}