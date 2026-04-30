import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { BadRequest } from '../../lib/errors.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../config/providers.js';

export interface SimilarMemory {
  id: string;
  projectId: string | null;
  category: string;
  key: string;
  value: string;
  similarity: number;
}

interface FindSimilarInput {
  projectId: string;
  query: string;
  limit?: number;
  threshold?: number;
}

/**
 * Service that produces OpenAI text-embedding-3-small vectors (1536 dim)
 * and performs pgvector cosine similarity searches against the memories table.
 *
 * Transport: prefers OPENAI_API_KEY. Falls back to OpenRouter. All failures
 * are logged and return null so callers can gracefully fall back to keyword
 * search.
 */
export class EmbeddingsService {
  private readonly model = LLM_MODELS.embedding.base;
  private readonly dims = LLM_MODELS.embedding.dims;

  async embed(text: string): Promise<number[] | null> {
    const clean = (text ?? '').replace(/\s+/g, ' ').trim().slice(0, 8000);
    if (!clean) return null;
    const out = await this.embedBatch([clean]);
    return out[0] ?? null;
  }

  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    const inputs = texts.map((t) => (t ?? '').replace(/\s+/g, ' ').trim().slice(0, 8000));
    if (inputs.every((t) => !t)) return inputs.map(() => null);

    // Primary: OpenAI direct
    if (env.OPENAI_API_KEY) {
      try {
        return await this.callEmbeddings(
          PROVIDER_URLS.openai.embeddings,
          env.OPENAI_API_KEY,
          this.model,
          inputs,
        );
      } catch (err) {
        console.error('[embeddings] OpenAI failed, trying OpenRouter', err);
      }
    }
    // Fallback: OpenRouter (uses fully qualified model id)
    if (env.OPENROUTER_API_KEY) {
      try {
        return await this.callEmbeddings(
          PROVIDER_URLS.openrouter.embeddings,
          env.OPENROUTER_API_KEY,
          LLM_MODELS.embedding.openrouter,
          inputs,
          { 'HTTP-Referer': env.WEB_URL, 'X-Title': 'Radikal' },
        );
      } catch (err) {
        console.error('[embeddings] OpenRouter failed', err);
      }
    }
    return inputs.map(() => null);
  }

  private async callEmbeddings(
    url: string,
    apiKey: string,
    model: string,
    input: string[],
    extraHeaders: Record<string, string> = {},
  ): Promise<(number[] | null)[]> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({ model, input }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new BadRequest(`Embeddings upstream ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
    };
    const data = json.data ?? [];
    const result: (number[] | null)[] = new Array(input.length).fill(null);
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item) continue;
      const idx = typeof item.index === 'number' ? item.index : i;
      const emb = item.embedding;
      if (Array.isArray(emb) && emb.length === this.dims) result[idx] = emb;
    }
    return result;
  }

  /** Format a JS array as a pgvector literal: "[0.1,0.2,...]" */
  private toVectorLiteral(v: number[]): string {
    return `[${v.join(',')}]`;
  }

  /**
   * Cosine-similarity search over memories.embedding scoped to a project.
   * `threshold` is the MIN similarity (0-1) required; default 0.75.
   */
  async findSimilarMemories(input: FindSimilarInput): Promise<SimilarMemory[]> {
    const limit = input.limit ?? 5;
    const threshold = input.threshold ?? 0.75;
    const vec = await this.embed(input.query);
    if (!vec) return [];
    const literal = this.toVectorLiteral(vec);

    try {
      // cosine_distance in [0,2]; similarity = 1 - distance/... Simpler: 1 - (embedding <=> vec)
      // pgvector: <=> returns cosine distance (1 - cosine_similarity) when vectors normalized.
      // We filter by distance <= (1 - threshold).
      const maxDistance = 1 - threshold;
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          project_id: string | null;
          category: string;
          key: string;
          value: string;
          distance: number;
        }>
      >(Prisma.sql`
        select id, project_id, category, key, value,
               (embedding <=> ${literal}::vector) as distance
        from public.memories
        where project_id = ${input.projectId}::uuid
          and embedding is not null
          and category <> 'chat_summary'
          and (embedding <=> ${literal}::vector) <= ${maxDistance}
        order by embedding <=> ${literal}::vector asc
        limit ${limit}
      `);
      return rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        category: r.category,
        key: r.key,
        value: r.value,
        similarity: 1 - Number(r.distance ?? 1),
      }));
    } catch (err) {
      console.error('[embeddings] similarity search failed', err);
      return [];
    }
  }

  /**
   * Fire-and-forget: compute embedding for a Memory and persist it via raw SQL.
   * Never throws.
   */
  async indexMemory(memoryId: string, text: string): Promise<void> {
    try {
      const vec = await this.embed(text);
      if (!vec) return;
      const literal = this.toVectorLiteral(vec);
      await prisma.$executeRaw(Prisma.sql`
        update public.memories set embedding = ${literal}::vector where id = ${memoryId}::uuid
      `);
    } catch (err) {
      console.error('[embeddings] indexMemory failed', err);
    }
  }
}

export const embeddingsService = new EmbeddingsService();
