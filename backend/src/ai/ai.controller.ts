import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AiService } from './ai.service'
import { MatchRequestDto } from './dto/match.dto'

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('match')
  @ApiOperation({ summary: 'Match a question against FAQ/question embeddings (intern+)' })
  match(@Body() dto: MatchRequestDto) {
    return this.aiService.findMatches(dto)
  }
}