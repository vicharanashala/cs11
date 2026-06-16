import { Logger } from '@nestjs/common'

export interface HuggingFaceProviderConfig {
  apiKey: string
  model: string
  logger: Logger
}

export class HuggingFaceProvider {
  private readonly apiKey: string
  private readonly model: string
  private readonly logger: Logger
  private readonly baseUrl = 'https://api-inference.huggingface.co'
  private readonly expectedDims = 384

  constructor(config: HuggingFaceProviderConfig) {
    this.apiKey = config.apiKey
    this.model = config.model
    this.logger = config.logger
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text])
    return results[0] ?? []
  }

  async embed(texts: string[]): Promise<number[][]> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    try {
      const response = await fetch(
        this.baseUrl + '/pipeline/feature-extraction/' + this.model,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: 'Bearer ' + this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
        },
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        const body = await response.text().catch(function () { return '' })
        this.logger.error('HuggingFace responded ' + response.status + ': ' + body)
        throw new Error('HuggingFace responded ' + response.status)
      }

      const data = (await response.json()) as number[][]

      // Validate shape: each embedding must be exactly 384 dims
      const bad = data.findIndex((v: unknown) => { return !Array.isArray(v) || (v as number[]).length !== this.expectedDims })
      if (bad !== -1) {
        const item = data[bad]
        const got = Array.isArray(item) ? item.length : typeof item
        this.logger.error(
          'HuggingFace returned unexpected embedding shape at index ' + bad + ': expected ' + this.expectedDims + ' dims, got ' + got,
        )
        throw new Error(
          'HuggingFace returned unexpected embedding shape: expected ' + this.expectedDims + ' dimensions, got ' + got,
        )
      }

      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error?.name === 'AbortError') {
        this.logger.error('HuggingFace embedding request timed out after 30s')
        throw new Error('HuggingFace embedding request timed out after 30s')
      }
      this.logger.error('HuggingFace embed failed: ' + (error?.message ?? String(error)))
      throw error
    }
  }
}