import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AssetType = 'image' | 'video' | 'document' | 'audio';

export interface ContentAsset {
  id: string;
  project_id: string;
  user_id: string;
  asset_url: string;
  asset_type: AssetType;
  ai_description: string | null;
  aesthetic_score: number | null;
  marketing_feedback: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ContentEvaluationResult {
  aesthetic_score: number;
  marketing_feedback: string;
  tags: string[];
  suggestions: string[];
  detected_elements: string[];
}

export interface AssetFilters {
  type?: AssetType;
  sort?: 'recent' | 'score';
}

export function useAssets(projectId: string | null | undefined, filters: AssetFilters = {}) {
  return useQuery({
    queryKey: ['content', 'list', projectId, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('project_id', projectId as string);
      if (filters.type) qs.set('type', filters.type);
      if (filters.sort) qs.set('sort', filters.sort);
      const r = await api.get<{ data: ContentAsset[] }>(`/content?${qs.toString()}`);
      return r.data;
    },
    enabled: !!projectId,
  });
}

export function useAsset(id: string | null | undefined) {
  return useQuery({
    queryKey: ['content', 'detail', id],
    queryFn: async () => {
      const r = await api.get<{ data: ContentAsset }>(`/content/${id}`);
      return r.data;
    },
    enabled: !!id,
  });
}

export interface CreateAssetInput {
  project_id: string;
  asset_url: string;
  asset_type: AssetType;
  metadata?: Record<string, unknown>;
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const r = await api.post<{ data: ContentAsset }>('/content', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      await api.delete(`/content/${id}`);
      return id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      project_id: _pid,
      ...patch
    }: {
      id: string;
      project_id: string;
      tags?: string[];
      ai_description?: string | null;
    }) => {
      const r = await api.patch<{ data: ContentAsset }>(`/content/${id}`, patch);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['content', 'detail', vars.id] });
    },
  });
}

export interface EditImageInput {
  source_asset_id: string;
  edit_instruction: string;
  project_id?: string;
  source_section?: string;
}

export interface EditImageResult {
  jobId: string;
  assetId?: string;
  url: string;
  model: 'gemini-2.5-flash-image' | 'dall-e-3';
  parent_asset_id: string;
}

export function useEditImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EditImageInput) => {
      const r = await api.post<{ data: EditImageResult }>('/ai-services/edit-image', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      if (vars.project_id) {
        qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
        qc.invalidateQueries({ queryKey: ['content-assets', 'image', vars.project_id] });
      }
    },
  });
}

export interface CaptionVariant {
  length: 'short' | 'medium' | 'long';
  caption: string;
  hashtags: string[];
  emoji_suggested: string[];
}

export interface GenerateCaptionInput {
  asset_id?: string;
  topic?: string;
  platforms: string[];
  tone?: string;
  project_id?: string;
}

export interface GenerateCaptionResult {
  per_platform: Record<string, { variants: CaptionVariant[] }>;
}

export function useGenerateCaption() {
  return useMutation({
    mutationFn: async (input: GenerateCaptionInput) => {
      const r = await api.post<{ data: GenerateCaptionResult }>(
        '/ai-services/generate-caption',
        input,
      );
      return r.data;
    },
  });
}

export function useEvaluateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const r = await api.post<{
        data: { job_id: string; result: ContentEvaluationResult; asset: ContentAsset };
      }>(`/content/${id}/evaluate`);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['content', 'detail', vars.id] });
    },
  });
}
export interface GenerateImageResult {
  jobId: string;
  batchId?: string;
  variations?: Array<{
    assetId?: string;
    url: string;
    variant_label: string;
    model: string;
    quality_score?: number;
  }>;
  assetId?: string;
  url: string;
  prompt: string;
  size: string;
  style: string;
  model: string;
}

export function useGenerateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      prompt: string;
      size: string;
      style: string;
      project_id?: string;
      reference_asset_ids?: string[];
      use_brand_palette?: boolean;
      variations?: number;
      source_section?: string;
    }) => {
      const res = await api.post<{ data: GenerateImageResult }>(
        '/ai-services/generate-image',
        vars,
      );
      return res.data;
    },
    onSuccess: (_d, vars) => {
      if (vars.project_id) {
        qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
      }
    },
  });
}

export function useAnalyzeImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const r = await api.post<{ data: { asset_id: string; visual_analysis: unknown } }>(
        '/ai-services/analyze-image',
        { asset_id: id },
      );
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['content', 'detail', vars.id] });
    },
  });
}
