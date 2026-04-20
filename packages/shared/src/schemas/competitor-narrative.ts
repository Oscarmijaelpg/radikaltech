import { z } from 'zod';

export const COMPETITOR_NARRATIVE_VERSION = 'v1';

export const CompetitorNarrativeSchema = z.object({
  version: z.literal(COMPETITOR_NARRATIVE_VERSION),
  summary: z.string().min(1),
  aesthetic: z.string().min(1),
  opportunity: z.string().min(1),
});

export type CompetitorNarrative = z.infer<typeof CompetitorNarrativeSchema>;
