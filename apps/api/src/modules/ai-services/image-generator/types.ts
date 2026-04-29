export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageStyle = 'vivid' | 'natural';
export type ImageMode = 'referential' | 'creative';
export type ImageModel = string;

export interface GenerateImageInput {
  prompt: string;
  mode?: ImageMode;
  size?: ImageSize;
  style?: ImageStyle;
  userId: string;
  projectId?: string;
  referenceAssetIds?: string[];
  useBrandPalette?: boolean;
  variations?: number;
  sourceSection?: string;
}

export interface GeneratedVariation {
  assetId?: string;
  url: string;
  variant_label: string;
  model: ImageModel;
  quality_score?: number;
}

export interface GenerateImageOutput {
  jobId: string;
  batchId: string;
  variations: GeneratedVariation[];
  assetId?: string;
  url: string;
  prompt: string;
  size: ImageSize;
  style: ImageStyle;
  model: ImageModel;
}

export interface EditImageInput {
  sourceAssetId: string;
  editInstruction: string;
  userId: string;
  projectId?: string;
  sourceSection?: string;
}

export interface EditImageOutput {
  jobId: string;
  assetId?: string;
  url: string;
  model: ImageModel;
  parent_asset_id: string;
}

export const VARIATION_SUFFIXES: string[] = [
  '',
  '\n\nVariante alternativa: enfoque más minimalista',
  '\n\nVariante alternativa: composición más dinámica, ángulos inusuales',
  '\n\nVariante alternativa: estilo fotográfico editorial',
];
