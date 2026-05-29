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
import { CreateQuestionDto } from './dtos/create-question.dto'
import { JwtGuard } from '../auth/guards'

@ApiTags('questions')
@Controller('questions')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask a question — AI match check, then save if no good match (intern+)' })
  async ask(
    @Body() dto: CreateQuestionDto,
    @Query('forceSubmit') forceSubmit: string,
    @Request() req: any,
  ) {
    if (forceSubmit === 'true') {
      const result = await this.questionsService.create(dto, req.user.userId)
      return { questionId: result.questionId, message: result.message }
    }

    const match = await this.questionsService.checkAiMatch(dto)

    if (match.aiMatch && match.faq) {
      return { aiMatch: true, faq: match.faq }
    }

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
}