import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type IdeaAngle =
  | 'auto'
  | 'educativo'
  | 'entretenimiento'
  | 'venta'
  | 'storytelling';

export interface ContentIdea {
  title: string;
  description: string;
  platform: 'Instagram' | 'LinkedIn' | 'Twitter' | 'TikTok';
  visual_suggestion: string;
  type: 'pilar' | 'carrusel';
  image_count: number;
}

export interface GenerateIdeasResponse {
  ideas: ContentIdea[];
}

export function useGenerateIdeas() {
  return useMutation({
    mutationFn: async (vars: { projectId: string; angle?: IdeaAngle; count?: number }) => {
      const res = await api.post<{ data: GenerateIdeasResponse }>(
        '/content/generate-ideas',
        {
          project_id: vars.projectId,
          angle: vars.angle,
          count: vars.count,
        },
        { timeoutMs: 150_000 },
      );
      return res.data;
    },
  });
}
