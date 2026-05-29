import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { InjectConnection } from '@nestjs/mongoose'
import { Model, Types, Connection } from 'mongoose'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { Answer, AnswerDocument } from './answer.schema'
import { CreateAnswerDto } from './dtos/create-answer.dto'
import { VoteDto } from './dtos/vote.dto'
import { MetaService } from '../admin/meta.service'

@Injectable()
export class AnswersService {
  constructor(
    @InjectModel(Answer.name) private answerModel: Model<AnswerDocument>,
    @InjectConnection() private connection: Connection,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly metaService: MetaService,
  ) {}

  async create(questionId: string, dto: CreateAnswerDto, userId: string): Promise<AnswerDocument> {
    // Check question status before allowing answer
    const question = await this.connection
      .collection('questions')
      .findOne({ _id: new Types.ObjectId(questionId) }, { session: undefined })

    if (!question) throw new NotFoundException('Question not found')
    if (question.status === 'closed') {
      throw new BadRequestException('This question is closed.')
    }

    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      const answer = new this.answerModel({
        questionId: new Types.ObjectId(questionId),
        body: dto.body,
        contributedBy: new Types.ObjectId(userId),
      })
      const saved = await answer.save({ session })

      // Add answer ref to question's answers array
      await this.connection
        .collection('questions')
        .updateOne({ _id: new Types.ObjectId(questionId) }, { $push: { answers: saved._id } as any }, { session })

      // If question was open, advance to in_progress
      await this.connection
        .collection('questions')
        .updateOne({ _id: new Types.ObjectId(questionId), status: 'open' }, { $set: { status: 'in_progress' } }, { session })

      await session.commitTransaction()
      return saved
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  async vote(answerId: string, voterId: string, dto: VoteDto): Promise<{ action: string; upvotes: number; downvotes: number }> {
    const voterOid = new Types.ObjectId(voterId)
    const answer = await this.answerModel.findById(answerId).exec()
    if (!answer) throw new NotFoundException('Answer not found')

    // Cannot vote on own answer
    if (answer.contributedBy.toString() === voterId) {
      throw new BadRequestException('Cannot vote on your own answer.')
    }

    const existingVote = answer.votes.find((v) => v.userId.toString() === voterId)
    const newValue: 1 | -1 = dto.value

    let incUpvotes = 0
    let incDownvotes = 0
    let newVoteEntry: { userId: Types.ObjectId; value: number } | null = null

    if (existingVote) {
      if (existingVote.value === newValue) {
        // Same direction → toggle off (remove vote)
        const pullIdx = answer.votes.findIndex((v) => v.userId.toString() === voterId)
        answer.votes.splice(pullIdx, 1)
        if (newValue === 1) incUpvotes = -1
        else incDownvotes = -1
      } else {
        // Opposite direction → flip vote
        existingVote.value = newValue
        if (newValue === 1) { incUpvotes = 1; incDownvotes = -1 }
        else { incUpvotes = -1; incDownvotes = 1 }
      }
    } else {
      // New vote
      answer.votes.push({ userId: voterOid, value: newValue })
      if (newValue === 1) incUpvotes = 1
      else incDownvotes = 1
    }

    // Use findOneAndUpdate for atomic vote + count update
    const updated = await this.answerModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(answerId) },
        {
          $set: { votes: answer.votes },
          $inc: { upvotes: incUpvotes, downvotes: incDownvotes },
        },
        { new: true },
      )
      .exec()

    // Update contributor reputation: +2 per net upvote, -1 per net downvote
    if (answer.contributedBy) {
      const repDelta = incUpvotes * 2 + incDownvotes * -1
      if (repDelta !== 0) {
        await this.connection
          .collection('users')
          .updateOne({ _id: answer.contributedBy }, { $inc: { reputation: repDelta } })
      }
    }

    return {
      action: existingVote ? (existingVote.value === newValue ? 'removed' : 'changed') : 'added',
      upvotes: updated!.upvotes,
      downvotes: updated!.downvotes,
    }
  }

  async acceptAnswer(questionId: string, answerId: string, askedByUserId: string): Promise<void> {
    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      // Verify the requesting user is the question asker
      const question = await this.connection
        .collection('questions')
        .findOne({ _id: new Types.ObjectId(questionId) }, { session })

      if (!question) throw new NotFoundException('Question not found')
      if (question.askedBy.toString() !== askedByUserId) {
        throw new ForbiddenException('Only the question author may accept an answer.')
      }

      // Unaccept all other answers for this question
      await this.connection
        .collection('answers')
        .updateMany({ questionId: new Types.ObjectId(questionId) }, { $set: { isAccepted: false } }, { session })

      // Accept the target answer
      await this.connection
        .collection('answers')
        .updateOne({ _id: new Types.ObjectId(answerId) }, { $set: { isAccepted: true } }, { session })

      // Close the question
      await this.connection
        .collection('questions')
        .updateOne({ _id: new Types.ObjectId(questionId) }, { $set: { status: 'resolved' } }, { session })

      await session.commitTransaction()
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  async promoteToFaq(
    questionId: string,
    dto: { answerId: string; title: string; category: string; tags?: string[] },
    adminUserId: string,
  ): Promise<void> {
    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      const answer = await this.connection
        .collection('answers')
        .findOne({ _id: new Types.ObjectId(dto.answerId) }, { session })

      const question = await this.connection
        .collection('questions')
        .findOne({ _id: new Types.ObjectId(questionId) }, { session })

      if (!answer || !question) throw new NotFoundException('Answer or question not found')

      // Create the FAQ
      const faqBody = `${question.body}\n\n---\nAccepted Answer:\n${answer.body}`
      await this.connection.collection('faqs').insertOne(
        {
          title: dto.title,
          body: faqBody,
          category: new Types.ObjectId(dto.category),
          tags: dto.tags ?? [],
          status: 'published',
          author: new Types.ObjectId(adminUserId),
          officialAnswer: answer.body,
          upvotes: 0,
          downvotes: 0,
          viewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { session },
      )

      // Mark answer as official admin answer
      await this.connection
        .collection('answers')
        .updateOne({ _id: new Types.ObjectId(dto.answerId) }, { $set: { isOfficialAdminAnswer: true } }, { session })

      // Close the question
      await this.connection
        .collection('questions')
        .updateOne({ _id: new Types.ObjectId(questionId) }, { $set: { status: 'closed' } }, { session })

      await session.commitTransaction()

      // Fire-and-forget: rebuild AI index — stamp lastRebuild on success only
      const aiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
      this.httpService.axiosRef
        .post(`${aiUrl}/rebuild-index`)
        .then(() => this.metaService.setLastRebuild())
        .catch(() => { /* silently ignore — stale index is observable via analytics */ })
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  async findByQuestion(questionId: string): Promise<AnswerDocument[]> {
    return this.answerModel
      .find({ questionId: new Types.ObjectId(questionId) })
      .sort({ upvotes: -1, createdAt: 1 })
      .populate('contributedBy', 'name email role')
      .exec()
  }
}