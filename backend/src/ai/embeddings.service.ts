import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
  embedSingle(text: string): Promise<number[]>
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name)
  private readonly provider: EmbeddingProvider

  constructor(private readonly configService: ConfigService) {
    const providerType = this.configService.get<string>('EMBEDDING_PROVIDER', 'huggingface')

    if (providerType === 'mock') {
      this.logger.warn('EMBEDDING_PROVIDER=mock — using deterministic pseudo-embeddings (dev/test only)')
      this.provider = new MockProvider()
    } else if (providerType === 'ollama') {
      this.provider = new OllamaProvider(
        this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434'),
        this.configService.get<string>('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text'),
        this.logger,
      )
    } else {
      // Default: HuggingFace
      this.provider = new HuggingFaceProvider(
        this.configService.get<string>('HUGGINGFACE_API_KEY', ''),
        this.configService.get<string>('HUGGINGFACE_MODEL', 'sentence-transformers/all-MiniLM-L6-v2'),
        this.logger,
      )
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.provider.embedSingle(text)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.provider.embed(texts)
  }
}

// ─── HuggingFace Provider ─────────────────────────────────────────────────────

class HuggingFaceProvider implements EmbeddingProvider {
  private readonly client: AxiosInstance
  private readonly model: string
  private readonly logger: Logger
  private rateLimited = false
  private rateLimitResetAt: number | null = null

  constructor(apiKey: string, model: string, logger: Logger) {
    this.client = axios.create({
      baseURL: 'https://api-inference.huggingface.co',
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    this.model = model
    this.logger = logger
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text])
    return results[0] ?? []
  }

  async embed(texts: string[]): Promise<number[][]> {
    // If we're rate limited, silently return empty vectors
    if (this.rateLimited) {
      // Check if enough time has passed to retry (try again after 1 hour)
      if (this.rateLimitResetAt && Date.now() > this.rateLimitResetAt) {
        this.rateLimited = false
        this.rateLimitResetAt = null
        this.logger.log('HuggingFace rate limit window passed — retrying')
      } else {
        this.logger.warn('HuggingFace rate limited — skipping embedding, falling back to keyword matching')
        return texts.map(() => [])
      }
    }

    try {
      const response = await this.client.post<number[][]>(
        `/pipeline/feature-extraction/${this.model}`,
        { inputs: texts, options: { wait_for_model: true } },
      )
      return response.data
    } catch (error: any) {
      const status = error?.response?.status

      if (status === 429) {
        // Rate limited — disable silently until reset
        this.rateLimited = true
        this.rateLimitResetAt = Date.now() + 1000 * 60 * 60 // 1 hour
        this.logger.warn('HuggingFace rate limit hit — AI matching disabled until reset. Falling back to keyword matching.')
        return texts.map(() => [])
      }

      if (status === 503) {
        // Model is loading (cold start) — log and return empty
        this.logger.warn('HuggingFace model is loading (cold start) — retrying next request')
        return texts.map(() => [])
      }

      this.logger.error(`HuggingFace embed failed: ${(error as Error).message}`)
      return texts.map(() => [])
    }
  }
}

// ─── Ollama Provider ──────────────────────────────────────────────────────────

class OllamaProvider implements EmbeddingProvider {
  private readonly client: AxiosInstance
  private readonly model: string
  private readonly logger: Logger

  constructor(baseUrl: string, model: string, logger: Logger) {
    this.client = axios.create({ baseURL: baseUrl, timeout: 60_000 })
    this.model = model
    this.logger = logger
  }

  async embedSingle(text: string): Promise<number[]> {
    try {
      const response = await this.client.post<{ embedding: number[] }>('/api/embeddings', {
        model: this.model,
        prompt: text,
      })
      return response.data.embedding
    } catch (error) {
      this.logger.error(`Ollama embed failed: ${(error as Error).message}`)
      throw error
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    for (const text of texts) {
      try {
        const response = await this.client.post<{ embedding: number[] }>('/api/embeddings', {
          model: this.model,
          prompt: text,
        })
        results.push(response.data.embedding)
      } catch (error) {
        this.logger.error(`Ollama embed failed for "${text.slice(0, 40)}...": ${(error as Error).message}`)
        results.push([])
      }
    }
    return results
  }
}

// ─── Mock Provider (dev/test only) ───────────────────────────────────────────

class MockProvider implements EmbeddingProvider {
  private readonly DIM = 384

  async embedSingle(text: string): Promise<number[]> {
    return this.buildVector(text)
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.buildVector(t))
  }

  private buildVector(text: string): number[] {
    let seed = this.hashStr(text)
    const rng = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const raw = Array.from({ length: this.DIM }, () => rng() * 2 - 1)
    const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0))
    return norm === 0 ? raw : raw.map((v) => v / norm)
  }

  private hashStr(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
    }
    return h >>> 0
  }
}