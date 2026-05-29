import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Meta, MetaDocument } from './meta.schema'

@Injectable()
export class MetaService {
  private readonly META_ID = 'global'

  constructor(@InjectModel(Meta.name) private metaModel: Model<MetaDocument>) {}

  async getLastRebuild(): Promise<Date | null> {
    const meta = await this.metaModel.findById(this.META_ID).lean().exec()
    return meta?.lastIndexRebuild ?? null
  }

  async setLastRebuild(date: Date = new Date()): Promise<void> {
    await this.metaModel.findByIdAndUpdate(
      this.META_ID,
      { _id: this.META_ID, lastIndexRebuild: date },
      { upsert: true },
    )
  }
}