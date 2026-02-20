import { WhisperSegment } from './whisper-segment.model';

export type ClipStatus = 'pending' | 'extracting' | 'ready' | 'error';

export interface Clip {
  id: string;
  name: string;
  /** Original video file (kept for reference; may be cleared to free memory). */
  file: File | null;
  status: ClipStatus;
  /** Extracted audio (WAV or similar) when status is ready. */
  audioBlob?: Blob;
  errorMessage?: string;
  createdAt: number;
  /** One-shot Whisper: full text. */
  transcription?: string;
  /** One-shot Whisper: word-level segments (t0, t1, text). */
  segments?: WhisperSegment[];
  transcribing?: boolean;
  transcriptionError?: string;
}
