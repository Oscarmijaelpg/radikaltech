export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageStyle = 'vivid' | 'natural';
export type ImageModel = 'gemini-2.5-flash-image' | 'dall-e-3';

export interface GeneratedVariation {
  assetId?: string;
  url: string;
  variant_label: string;
  model: ImageModel;
  quality_score?: number;
}

export interface GenerateResult {
  jobId: string;
  batchId?: string;
  variations?: GeneratedVariation[];
  assetId?: string;
  url: string;
  prompt: string;
  size: ImageSize;
  style: ImageStyle;
  model: ImageModel;
}

export interface ContentAssetDTO {
  id: string;
  project_id: string;
  asset_url: string;
  asset_type: 'image' | 'video' | 'document' | 'audio';
  ai_description: string | null;
  tags: string[];
  metadata: unknown;
  created_at: string;
}

export interface Preset {
  id: string;
  label: string;
  icon: string;
  size: ImageSize;
  prefix: string;
}

export const MAX_REFS = 6;
