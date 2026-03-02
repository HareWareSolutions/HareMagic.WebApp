
export enum AspectRatio {
  SQUARE = '1:1',
  STORY = '9:16',
  PORTRAIT = '4:5',
}

export interface CreativeAsset {
  id: string;
  url: string;
  base64: string; // Raw base64 string without data:image/... prefix
  mimeType: string;
}

export interface GenerationRequest {
  assets: CreativeAsset[];
  prompt: string;
  ratio: AspectRatio;
}

export interface GenerationState {
  isGenerating: boolean;
  resultImage: string | null;
  resultImages?: string[]; // Array of base64 images for the carousel
  error: string | null;
  progress?: string;
}

export enum PostType {
  SINGLE = 'SINGLE',
  CAROUSEL = 'CAROUSEL'
}

export interface CarouselSlide {
  id: string;
  instruction: string;
}

// Novos tipos para controle de Planos e Banco de Dados
export type PlanTier = 'talisma' | 'encantamento' | 'conjurador' | 'oraculo';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  limit: number;
}

export interface UserProfile {
  email: string;
  name: string;
  plan: PlanTier;
  generationsUsed: number;
  lastResetDate: string; // ISO String date
}
