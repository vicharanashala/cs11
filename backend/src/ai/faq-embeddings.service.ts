import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { InjectConnection } from '@nestjs/mongoose'
import { Model, Types, Connection } from 'mongoose'
import { FaqEmbedding, FaqEmbeddingDocument } from './schemas/faq-embeddings.schema'
import { EmbeddingsService } from './embeddings.service'

@Injectable()
export class FaqEmbeddingsService {
  private readonly logger = new Logger(FaqEmbeddingsService.name)

  constructor(
    @InjectModel(FaqEmbedding.name) private embeddingModel: Model<FaqEmbeddingDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  // ─── Cosine similarity ─────────────────────────────────────────────────────

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom === 0 ? 0 : dot / denom
  }

  // ─── Upsert — called on FAQ create / update ────────────────────────────────

  /**
   * Generate and persist an embedding for a single FAQ.
   * Safe to call on every FAQ publish/update.
   */
  async upsert(faqId: string, title: string, body: string): Promise<void> {
    const text = `${title}\n\n${body}`
    let embedding: number[]
    try {
      embedding = await this.embeddingsService.generateEmbedding(text)
    } catch (error) {
      this.logger.error(`Failed to generate embedding for FAQ ${faqId}: ${(error as Error).message}`)
      throw error
    }

    if (!embedding || embedding.length === 0) {
      throw new Error('Ollama returned an empty embedding vector')
    }

    await this.embeddingModel.findOneAndUpdate(
      { faqId: new Types.ObjectId(faqId) },
      { faqId: new Types.ObjectId(faqId), title, body, embedding },
      { upsert: true },
    )

    this.logger.log(`Embedding upserted for FAQ ${faqId} (vector dim: ${embedding.length})`)
  }

  // ─── Rebuild — called by AdminService.rebuildIndex() ───────────────────────

  /**
   * Fetch all published FAQs, regenerate and persist their embeddings.
   * Returns the count of FAQs re-indexed.
   */
  async rebuildAll(): Promise<number> {
    const faqs = await this.connection
      .collection('faqs')
      .find({ status: 'published' }, { projection: { _id: 1, title: 1, body: 1 } })
      .toArray()

    if (faqs.length === 0) {
      this.logger.log('rebuildAll: no published FAQs to index')
      return 0
    }

    this.logger.log(`rebuildAll: indexing ${faqs.length} FAQs...`)

    // Build texts for batch embedding
    const texts = faqs.map((f) => `${f.title}\n\n${f.body}`)

    // Embed in batches of 16 to avoid hammering Ollama
    const BATCH = 16
    const allVectors: number[][] = []
    let allBatchesFailed = true
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH)
      try {
        const vectors = await this.embeddingsService.embedBatch(batch)
        allVectors.push(...vectors)
        if (vectors.some((v) => v.length > 0)) allBatchesFailed = false
      } catch (error) {
        this.logger.error(`Batch embed failed at offset ${i}: ${(error as Error).message}`)
        // Push empty vectors to keep alignment; these FAQs won't match anything
        allVectors.push(...batch.map(() => []))
      }
      this.logger.log(`rebuildAll: embedded batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(texts.length / BATCH)}`)
    }

    if (allBatchesFailed && texts.length > 0) {
      throw new Error('AI service unreachable — all batches failed')
    }

    // Bulk upsert
    const ops = faqs.map((faq, idx) => ({
      updateOne: {
        filter: { faqId: faq._id },
        update: {
          $set: {
            faqId: faq._id,
            title: faq.title,
            body: faq.body,
            embedding: allVectors[idx] ?? [],
          },
        },
        upsert: true,
      },
    }))

    const result = await this.embeddingModel.bulkWrite(ops)
    this.logger.log(`rebuildAll: ${result.upsertedCount} upserted, ${result.modifiedCount} modified`)

    return faqs.length
  }

  // ─── Remove ───────────────────────────────────────────────────────────────

  /**
   * Remove the stored embedding for a FAQ (e.g. when it is archived).
   */
  async removeEmbedding(faqId: string): Promise<void> {
    await this.embeddingModel.deleteOne({ faqId: new Types.ObjectId(faqId) })
    this.logger.log(`Embedding removed for FAQ ${faqId}`)
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  /**
   * Find the best-matching FAQ for a given query string.
   * Generates a query embedding, then does brute-force cosine similarity
   * over all stored FAQ embeddings. Returns null if no match above threshold.
   */
  async findBestMatch(
    queryText: string,
    confidenceThreshold: number,
  ): Promise<{ faqId: string; title: string; confidence: number } | null> {
    // Generate query embedding
    let queryEmbedding: number[]
    try {
      queryEmbedding = await this.embeddingsService.generateEmbedding(queryText)
    } catch (error) {
      this.logger.warn(`Embedding generation failed: ${(error as Error).message}`)
      return null
    }

    if (!queryEmbedding || queryEmbedding.length === 0) {
      return null
    }

    // Fetch all stored embeddings and compute cosine similarity
    const embeddings = await this.embeddingModel.find({}, { faqId: 1, title: 1, embedding: 1 }).lean().exec()

    let best: { faqId: string; title: string; confidence: number } | null = null
    let bestScore = -1

    for (const doc of embeddings) {
      if (!doc.embedding || doc.embedding.length === 0) continue
      const score = this.cosineSimilarity(queryEmbedding, doc.embedding)
      if (score > bestScore) {
        bestScore = score
        best = { faqId: doc.faqId.toString(), title: doc.title, confidence: Math.round(score * 100) / 100 }
      }
    }

    if (!best || best.confidence < confidenceThreshold) {
      return null
    }

    return best
  }
}