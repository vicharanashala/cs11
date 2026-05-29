import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { MatchRequestDto, MatchResponseDto } from './dto/match.dto'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly client: AxiosInstance
  private readonly serviceUrl: string
  private readonly confidenceThreshold: number

  constructor(private readonly configService: ConfigService) {
    this.serviceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
    this.confidenceThreshold = this.configService.get<number>('AI_CONFIDENCE_THRESHOLD', 0.75)

    this.client = axios.create({
      baseURL: this.serviceUrl,
      timeout: parseInt(this.configService.get<string>('AI_TIMEOUT_MS', '5000'), 10),
    })
  }

  async findMatches(dto: MatchRequestDto): Promise<MatchResponseDto> {
    try {
      const response = await this.client.post<MatchResponseDto>('/match', {
        question: dto.question,
        tags: dto.tags,
        category: dto.category,
        userContext: dto.userContext,
      })
      return response.data
    } catch (error) {
      this.logger.error(`AI service call failed: ${(error as Error).message}`)
      // Graceful fallback — return no matches on error
      return { matches: [] }
    }
  }

  async isConfidentEnough(response: MatchResponseDto): Promise<boolean> {
    if (!response.matches || response.matches.length === 0) return false
    return response.matches[0].confidence >= this.confidenceThreshold
  }
}