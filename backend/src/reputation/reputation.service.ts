import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { InjectConnection } from '@nestjs/mongoose'
import { Model, Types, Connection } from 'mongoose'
import { ReputationEvent, ReputationEventDocument, ReputationEventName } from './schemas/reputation-event.schema'
import { User, UserDocument } from '../users/schemas/user.schema'

@Injectable()
export class ReputationService {
  constructor(
    @InjectModel(ReputationEvent.name) private reputationEventModel: Model<ReputationEventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  /**
   * Awards (or deducts) reputation for a user.
   * Clamps the resulting reputation to >= 0.
   * Persists a ReputationEvent history record.
   * Returns the updated reputation value.
   */
  async award(
    userId: string,
    event: ReputationEventName,
    points: number,
    targetId: string,
    targetModel: 'Answer' | 'Question' | 'FAQ',
    description: string,
  ): Promise<number> {
    const userOid = new Types.ObjectId(userId)
    const targetOid = new Types.ObjectId(targetId)

    // Fetch current reputation to compute clamped delta
    const user = await this.userModel.findById(userId).select('reputation').lean()
    const currentRep = user?.reputation ?? 0
    const clampedDelta = Math.max(-currentRep, points)
    const actualPoints = Math.min(points, currentRep > 0 ? Infinity : 0)

    // If there's nothing to award after clamping (0 delta when points would go negative), skip
    if (clampedDelta === 0 && points < 0) {
      // Record the event with 0 points so the user sees what happened
      await this.reputationEventModel.create({
        userId: userOid,
        event,
        points: 0,
        targetId: targetOid,
        targetModel,
        description,
      })
      return 0
    }

    // Atomic increment with floor-at-0 guarantee
    const updated = await this.userModel.findOneAndUpdate(
      { _id: userOid },
      { $inc: { reputation: clampedDelta } },
      { returnDocument: 'after', select: 'reputation' },
    )

    const newReputation = (updated?.reputation ?? 0)

    // Persist history entry with the intended points (not the clamped delta)
    await this.reputationEventModel.create({
      userId: userOid,
      event,
      points: actualPoints !== 0 ? actualPoints : clampedDelta,
      targetId: targetOid,
      targetModel,
      description,
    })

    return newReputation
  }

  /**
   * Paginated reputation event history for a user, newest first.
   */
  async getHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: ReputationEvent[]; total: number; page: number; limit: number }> {
    const userOid = new Types.ObjectId(userId)
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.reputationEventModel
        .find({ userId: userOid })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.reputationEventModel.countDocuments({ userId: userOid }),
    ])

    return { data: data as ReputationEvent[], total, page, limit }
  }

  /**
   * Returns the current reputation value for a user.
   */
  async getReputation(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId).select('reputation').lean()
    return user?.reputation ?? 0
  }
}