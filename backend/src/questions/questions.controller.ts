import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { QuestionsService } from './questions.service'
import { AnswersService } from '../answers/answers.service'
import { CreateQuestionDto } from './dtos/create-question.dto'
import { PromoteFaqDto } from './dtos/promote-faq.dto'
import { JwtGuard } from '../auth/guards'
import { AdminGuard } from '../auth/guards'

@ApiTags('questions')
@Controller('questions')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly answersService: AnswersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask a question — intent check, AI match check, then save (intern+)' })
  async ask(
    @Body() dto: CreateQuestionDto,
    @Query('forceSubmit') forceSubmit: string,
    @Request() req: any,
  ) {
    // forceSubmit bypasses intent and AI matching — save directly
    if (forceSubmit === 'true') {
      const result = await this.questionsService.create(dto, req.user.userId)
      return { questionId: result.questionId, message: result.message }
    }

    // Intent detection + AI match in one call
    const intentOrMatch = await this.questionsService.checkIntentAndMatch(dto, req.user.userId)

    // Shape 3 — intent detection fired
    if (intentOrMatch && 'intentMatch' in intentOrMatch) {
      return intentOrMatch
    }

    // Shape 2 — AI match fired
    if (intentOrMatch && 'aiMatch' in intentOrMatch) {
      return intentOrMatch
    }

    // Shape 1 — no intent, no match; persist the question
    const result = await this.questionsService.create(dto, req.user.userId)
    return { questionId: result.questionId, message: result.message }
  }

  @Get()
  @ApiOperation({ summary: 'List questions — intern sees own, admin+ sees all (intern+)' })
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.questionsService.findAll({
      userId: req.user.userId,
      role: req.user.role,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question with answers sorted by upvotes (intern+)' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findById(id)
  }

  @Post(':id/promote-faq')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Promote a resolved question to an FAQ entry (admin+)' })
  async promoteToFaq(
    @Param('id') questionId: string,
    @Body() dto: PromoteFaqDto,
    @Request() req: any,
  ) {
    await this.answersService.promoteToFaq(questionId, dto, req.user.userId)
  }
}