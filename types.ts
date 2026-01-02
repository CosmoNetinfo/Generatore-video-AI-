
export interface ArticleSummary {
  script: string;
  headline: string;
  seoTitle: string;
  seoDescription: string;
  seoHashtags: string;
  sources?: { uri: string; title?: string }[];
}

export type GenerationStep = 'idle' | 'summarizing' | 'generating_audio' | 'generating_image' | 'complete' | 'exporting' | 'error';

export interface GenerationStatus {
  step: GenerationStep;
  message: string;
  progress?: number;
}
