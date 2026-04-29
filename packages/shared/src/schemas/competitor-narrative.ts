import { z } from 'zod';

export const COMPETITOR_NARRATIVE_VERSION = 'v1';

// Strings pueden venir vacías cuando el LLM no tiene data suficiente para
// un campo (p.ej. competidor sin posts → aesthetic vacía). El frontend
// muestra placeholder en ese caso; no rompe el job por un solo campo.
export const CompetitorNarrativeSchema = z.object({
  version: z.literal(COMPETITOR_NARRATIVE_VERSION),
  summary: z.string().default(''),
  aesthetic: z.string().default(''),
  opportunity: z.string().default(''),
});

export type CompetitorNarrative = z.infer<typeof CompetitorNarrativeSchema>;
