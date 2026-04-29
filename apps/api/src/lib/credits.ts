import { creditService } from '../modules/credits/service.js';
import { logger } from './logger.js';

// Keys de acciones que cobran monedas. Mantener en sync con action_prices (seed en DB).
// Agregar aquí al crear nueva acción cobrable — el type ayuda a evitar typos en los endpoints.
export const ACTION_KEYS = {
  chatMessage: 'chat.message',
  embeddingsGenerate: 'embeddings.generate',
  captionGenerate: 'caption.generate',
  brandSynthesize: 'brand.synthesize',
  recommendationsGenerate: 'recommendations.generate',
  autoCompetitorDetect: 'auto_competitor.detect',
  marketDetect: 'market.detect',
  imageAnalyze: 'image.analyze',
  contentEvaluate: 'content.evaluate',
  newsAggregate: 'news.aggregate',
  trendsDetect: 'trends.detect',
  competitorAnalyze: 'competitor.analyze',
  websiteAnalyze: 'website.analyze',
  imageGenerate: 'image.generate',
  imageEdit: 'image.edit',
  brandAnalyze: 'brand.analyze',
  tiktokScrape: 'tiktok.scrape',
  instagramScrape: 'instagram.scrape',
} as const;

export type ActionKey = (typeof ACTION_KEYS)[keyof typeof ACTION_KEYS];

// Envuelve una operación: cobra antes, reembolsa si la operación falla.
// Propaga tanto la PaymentRequired (402) como el error original si se ejecutó pero falló.
export async function withCredits<T>(
  params: { userId: string; actionKey: ActionKey; metadata?: Record<string, unknown> },
  fn: (ctx: { transactionId: string }) => Promise<T>,
): Promise<T> {
  const charge = await creditService.charge({
    userId: params.userId,
    actionKey: params.actionKey,
    metadata: params.metadata,
  });
  try {
    return await fn({ transactionId: charge.transactionId });
  } catch (err) {
    try {
      await creditService.refund({
        transactionId: charge.transactionId,
        reason: `Acción ${params.actionKey} fallida: ${err instanceof Error ? err.message : 'error'}`,
      });
    } catch (refundErr) {
      logger.warn(
        { err: refundErr, actionKey: params.actionKey, userId: params.userId },
        '[credits] auto-refund failed',
      );
    }
    throw err;
  }
}
