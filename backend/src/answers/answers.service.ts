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
import { EventsGateway } from '../events/events.gateway'
import { ReputationService } from '../reputation/reputation.service'

@Injectable()
export class AnswersService {
  constructor(
    @InjectModel(Answer.name) private answerModel: Model<AnswerDocument>,
    @InjectConnection() private connection: Connection,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly metaService: MetaService,
    private readonly events: EventsGateway,
    private readonly reputationService: ReputationService,
  ) {}

  async create(questionId: string, dto: CreateAnswerDto, userId: string): Promise<AnswerDocument> {
    // Check question status before allowing answer
    const question = await this.connection
      .collection('questions')
      .findOne({ _id: new Types.ObjectId(questionId) })

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
        .updateOne(
          { _id: new Types.ObjectId(questionId) },
          { $push: { answers: saved._id } as any },
          { session },
        )

      // If question was open, advance to in_progress
      await this.connection
        .collection('questions')
        .updateOne(
          { _id: new Types.ObjectId(questionId), status: 'open' },
          { $set: { status: 'in_progress' } },
          { session },
        )

      await session.commitTransaction()

      // Emit real-time events after successful commit
      this.events.emitAnswerCreated(questionId, saved.toObject())
      this.events.emitQuestionStatusChanged(questionId, 'in_progress')

      // Award participation reputation
      await this.reputationService.award(
        userId, 'question_answered', 2,
        saved._id.toString(), 'Answer', 'You posted an answer',
      )

      return saved
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  async vote(
    answerId: string,
    voterId: string,
    questionId: string,
    dto: VoteDto,
  ): Promise<{ action: string; upvotes: number; downvotes: number }> {
    const voterOid = new Types.ObjectId(voterId)
    const newValue: 1 | -1 = dto.value

    // Check answer exists and voter isn't self-voting
    const answer = await this.answerModel.findById(answerId).exec()
    if (!answer) throw new NotFoundException('Answer not found')

    // Ensure the answer belongs to the question being voted on
    if (answer.questionId.toString() !== questionId) {
      throw new ForbiddenException('Answer does not belong to this question.')
    }

    if (answer.contributedBy.toString() === voterId) {
      throw new BadRequestException('Cannot vote on your own answer.')
    }

    const existingVote = answer.votes.find((v) => v.userId.toString() === voterId)

    let action: string

    if (existingVote) {
      if (existingVote.value === newValue) {
        // Same direction: remove vote (toggle off)
        await this.answerModel.updateOne(
          { _id: new Types.ObjectId(answerId) },
          {
            $pull: { votes: { userId: voterOid } },
            $inc: { upvotes: newValue === 1 ? -1 : 0, downvotes: newValue === -1 ? -1 : 0 },
          },
        )
        action = 'removed'
      } else {
        // Opposite direction: flip vote atomically
        await this.answerModel.updateOne(
          { _id: new Types.ObjectId(answerId) },
          {
            $set: { 'votes.$[elem].value': newValue } as any,
            $inc: { upvotes: newValue === 1 ? 1 : -1, downvotes: newValue === -1 ? 1 : -1 },
          },
          { arrayFilters: [{ 'elem.userId': voterOid }] },
        )
        action = 'changed'
      }
    } else {
      // New vote: push to array and increment counter
      await this.answerModel.updateOne(
        { _id: new Types.ObjectId(answerId) },
        {
          $push: { votes: { userId: voterOid, value: newValue } },
          $inc: { upvotes: newValue === 1 ? 1 : 0, downvotes: newValue === -1 ? 1 : 0 },
        },
      )
      action = 'added'
    }

    // Award/reverse reputation via ReputationService
    if (answer.contributedBy) {
      if (action === 'added') {
        if (newValue === 1) {
          await this.reputationService.award(
            answer.contributedBy.toString(), 'answer_upvoted', 10,
            answerId, 'Answer', 'Your answer was upvoted',
          )
        } else {
          await this.reputationService.award(
            answer.contributedBy.toString(), 'answer_downvoted', -2,
            answerId, 'Answer', 'Your answer was downvoted',
          )
        }
      } else if (action === 'removed') {
        if (newValue === 1) {
          await this.reputationService.award(
            answer.contributedBy.toString(), 'answer_downvote_reversed', -10,
            answerId, 'Answer', 'An upvote on your answer was removed',
          )
        } else {
          await this.reputationService.award(
            answer.contributedBy.toString(), 'answer_upvoted', 2,
            answerId, 'Answer', 'A downvote on your answer was removed',
          )
        }
      } else if (action === 'changed') {
        if (newValue === 1) {
          // Was downvoted, now upvoted: reverse downvote (-2) + new upvote (+10) = +12 net
          await this.reputationService.award(
            answer.contributedBy.toString(), 'answer_downvote_reversed', -2,
            answerId, 'Answer', 'Your downvoted answer was upvoted',
          )
          await this.reputationService.award(
            answer.contributedBy.toString(), 'answer_upvoted', 10,
            answerId, 'Answer', 'Your answer was upvoted',
          )
        } else {
          // Was upvoted, now downvoted: reverse upvote (-10) + new downvote (-2) = -12 net
          await this.reputationService.award(
            answer.contributedBy.toString(), 'answer_upvoted', -10,
            answerId, 'Answer', 'An upvote on your answer was reversed to a downvote',
          )
          await this.reputationService.award(
            answer.contributedBy.toString(), 'answer_downvoted', -2,
            answerId, 'Answer', 'Your answer was downvoted',
          )
        }
      }
    }

    const updated = await this.answerModel.findById(answerId).lean().exec()

    // Emit real-time vote update to all connected clients
    this.events.emitVoteUpdated(answerId, 'answer', updated!.upvotes, updated!.downvotes)

    return { action, upvotes: updated!.upvotes, downvotes: updated!.downvotes }
  }

  async acceptAnswer(
    questionId: string,
    answerId: string,
    askedByUserId: string,
  ): Promise<void> {
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
        .updateMany(
          { questionId: new Types.ObjectId(questionId) },
          { $set: { isAccepted: false } },
          { session },
        )

      // Accept the target answer
      const acceptedResult = await this.connection
        .collection('answers')
        .updateOne(
          { _id: new Types.ObjectId(answerId), questionId: new Types.ObjectId(questionId) },
          { $set: { isAccepted: true } },
          { session },
        )

      if (acceptedResult.modifiedCount === 0) {
        throw new NotFoundException('Answer not found for this question.')
      }

      // Close the question
      await this.connection
        .collection('questions')
        .updateOne(
          { _id: new Types.ObjectId(questionId) },
          { $set: { status: 'resolved' } },
          { session },
        )

      await session.commitTransaction()

      this.events.emitQuestionStatusChanged(questionId, 'resolved')

      // Award reputation for accepted answer
      const acceptedAnswer = await this.answerModel.findById(answerId).lean()
      if (acceptedAnswer) {
        await this.reputationService.award(
          acceptedAnswer.contributedBy.toString(), 'answer_accepted', 15,
          answerId, 'Answer', 'Your answer was accepted',
        )
      }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }

  async promoteToFaq(
    questionId: string,
    dto: { answerId?: string; title: string; category: string; tags?: string[] },
    adminUserId: string,
  ): Promise<void> {
    const session = await this.connection.startSession()
    session.startTransaction()

    try {
      const question = await this.connection
        .collection('questions')
        .findOne({ _id: new Types.ObjectId(questionId) }, { session })

      if (!question) throw new NotFoundException('Question not found')

      // Resolve answerId: explicit value, or fall back to the accepted answer
      let targetAnswerId: string | undefined = dto.answerId

      if (!targetAnswerId) {
        const acceptedAnswer = await this.connection
          .collection('answers')
          .findOne(
            { questionId: new Types.ObjectId(questionId), isAccepted: true },
            { session },
          )
        targetAnswerId = acceptedAnswer?._id?.toString()
      }

      if (!targetAnswerId) {
        throw new BadRequestException(
          'No answerId provided and no accepted answer found on this question. Provide an answerId or accept an answer first.',
        )
      }

      const answer = await this.connection
        .collection('answers')
        .findOne({ _id: new Types.ObjectId(targetAnswerId) }, { session })

      if (!answer) throw new NotFoundException('Answer not found')

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
        .updateOne(
          { _id: new Types.ObjectId(targetAnswerId) },
          { $set: { isOfficialAdminAnswer: true } },
          { session },
        )

      // Close the question
      await this.connection
        .collection('questions')
        .updateOne(
          { _id: new Types.ObjectId(questionId) },
          { $set: { status: 'closed' } },
          { session },
        )

      await session.commitTransaction()

      // Fire-and-forget: rebuild AI index
      const aiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
      this.httpService.axiosRef
        .post(`${aiUrl}/rebuild-index`)
        .then(() => this.metaService.setLastRebuild())
        .catch(() => { /* silently ignore */ })

      this.events.emitFaqPublished({ title: dto.title, category: dto.category, tags: dto.tags })

      // Award high-quality contribution reputation to the answer author
      if (answer.contributedBy) {
        await this.reputationService.award(
          answer.contributedBy.toString(), 'faq_contributed', 25,
          targetAnswerId, 'FAQ', 'Your answer was promoted to a FAQ',
        )
      }
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