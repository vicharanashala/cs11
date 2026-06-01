import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { AnswersService } from './answers.service'
import { CreateAnswerDto } from './dtos/create-answer.dto'
import { VoteDto } from './dtos/vote.dto'
import { JwtGuard, AdminGuard } from '../auth/guards'

@ApiTags('answers')
@Controller('questions/:questionId/answers')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Get()
  @ApiOperation({ summary: 'List answers for a question, sorted by upvotes (intern+)' })
  findAll(@Param('questionId') questionId: string) {
    return this.answersService.findByQuestion(questionId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an answer to a question — auto-advances question to in_progress (intern+)' })
  create(
    @Param('questionId') questionId: string,
    @Body() dto: CreateAnswerDto,
    @Request() req: any,
  ) {
    return this.answersService.create(questionId, dto, req.user.userId)
  }

  @Post(':answerId/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vote on an answer — toggle if same direction, flip if opposite (intern+)' })
  vote(
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
    @Body() dto: VoteDto,
    @Request() req: any,
  ) {
    return this.answersService.vote(answerId, req.user.userId, dto)
  }

  @Patch(':answerId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an answer — only the question author may accept (intern+)' })
  accept(
    @Param('questionId') questionId: string,
    @Param('answerId') answerId: string,
    @Request() req: any,
  ) {
    return this.answersService.acceptAnswer(questionId, answerId, req.user.userId)
  }

  @Post('promote-faq')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Promote an answer to an official FAQ entry (admin+)' })
  promote(
    @Param('questionId') questionId: string,
    @Body() body: { answerId: string; title: string; category: string; tags?: string[] },
    @Request() req: any,
  ) {
    return this.answersService.promoteToFaq(questionId, body, req.user.userId)
  }
}