export interface ScannedDoc {
  id: string;
  timestamp: number;
  title: string;
  textData: string;
  analysis?: string;
  thumbnail?: string; // Base64 image data for preview
  type: 'pdf' | 'image';
}

export enum ViewState {
  HOME = 'HOME',
  SCANNING = 'SCANNING', // Selecting file/camera
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ANALYSIS = 'ANALYSIS'
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'ocr' | 'thinking' | 'complete' | 'error';
  message?: string;
}
