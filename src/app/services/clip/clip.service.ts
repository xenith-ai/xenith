import { Injectable } from '@angular/core';
import { Clip } from '../../models/clip.model';
import { FFmpegService } from '../ffmpeg/ffmpeg.service';
import { WhisperOneShotService } from '../whisper-one-shot/whisper-one-shot.service';

@Injectable({
  providedIn: 'root',
})
export class ClipService {
  private clips: Clip[] = [];
  private idCounter = 0;
  /** Clip currently shown on the video page (has file + transcription). */
  private videoPageClipId: string | null = null;

  constructor(
    private ffmpegService: FFmpegService,
    private whisperOneShot: WhisperOneShotService
  ) {}

  getClips(): Clip[] {
    return this.clips;
  }

  addClips(files: File[]): void {
    for (const file of files) {
      const clip: Clip = {
        id: `clip-${++this.idCounter}-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, '') || file.name,
        file,
        status: 'pending',
        createdAt: Date.now(),
      };
      this.clips.push(clip);
      this.extractAudioForClip(clip);
    }
  }

  private async extractAudioForClip(clip: Clip): Promise<void> {
    clip.status = 'extracting';
    clip.errorMessage = undefined;

    try {
      const blob = await this.ffmpegService.extractAudio(clip.file!);
      clip.audioBlob = blob;
      clip.status = 'ready';
      this.downloadExtractedAudio(blob, clip.name);
      this.transcribeClip(clip);
    } catch (err) {
      clip.status = 'error';
      clip.errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[ClipService] Extract audio failed for', clip.name, err);
    }
  }

  /** Run one-shot Whisper on a ready clip's audio and store transcription + segments. */
  async transcribeClip(clip: Clip): Promise<void> {
    if (clip.status !== 'ready' || !clip.audioBlob) {
      return;
    }
    clip.transcribing = true;
    clip.transcriptionError = undefined;
    clip.transcription = undefined;
    clip.segments = undefined;
    try {
      const arrayBuffer = await clip.audioBlob.arrayBuffer();
      const pcm = await this.whisperOneShot.decodeTo16kMono(arrayBuffer);
      const result = await this.whisperOneShot.transcribeWithVad(pcm);
      clip.transcription = result.transcription;
      clip.segments = result.segments;
      this.setVideoPageClip(clip);
    } catch (err) {
      clip.transcriptionError = err instanceof Error ? err.message : String(err);
      console.error('[ClipService] Transcribe failed for', clip.name, err);
    } finally {
      clip.transcribing = false;
    }
  }

  /** Returns the clip to show on the video page. Requires file, transcription, and per-word segments (used for skip intervals). */
  getVideoPageClip(): Clip | null {
    if (!this.videoPageClipId) return null;
    const clip = this.clips.find((c) => c.id === this.videoPageClipId);
    if (!clip?.file || !clip.transcription) return null;
    if (!clip.segments?.length) return null;
    return clip;
  }

  private downloadExtractedAudio(blob: Blob, baseName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.wav`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private setVideoPageClip(clip: Clip): void {
    const prev = this.videoPageClipId ? this.clips.find((c) => c.id === this.videoPageClipId) : null;
    if (prev && prev.id !== clip.id && prev.file) {
      prev.file = null;
    }
    this.videoPageClipId = clip.id;
  }
}
