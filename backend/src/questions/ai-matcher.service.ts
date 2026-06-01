import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'

interface AiMatchResult {
  matched: boolean
  faqId?: string
  confidence?: number
}

@Injectable()
export class AiMatcherService {
  private readonly logger = new Logger(AiMatcherService.name)
  private readonly serviceUrl: string
  private readonly confidenceThreshold: number

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
    this.confidenceThreshold = this.configService.get<number>('AI_CONFIDENCE_THRESHOLD', 0.75)
  }

  async match(query: string): Promise<AiMatchResult> {
    try {
      const response = await this.httpService.axiosRef.post(`${this.serviceUrl}/match`, {
        question: query,
      })

      const matches: Array<{ id: string; confidence: number }> = response.data?.matches ?? []

      if (matches.length === 0) {
        return { matched: false }
      }

      const top = matches[0]

      if (top.confidence >= this.confidenceThreshold) {
        return {
          matched: true,
          faqId: top.id,
          confidence: top.confidence,
        }
      }

      return { matched: false }
    } catch (error) {
      this.logger.warn(`AI match service unreachable: ${(error as Error).message}. Allowing question to proceed.`)
      return { matched: false }
    }
  }
}