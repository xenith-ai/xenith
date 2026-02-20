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
      clip.file = null;
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
      const result = await this.whisperOneShot.transcribe(pcm);
      clip.transcription = result.transcription;
      clip.segments = result.segments;
    } catch (err) {
      clip.transcriptionError = err instanceof Error ? err.message : String(err);
      console.error('[ClipService] Transcribe failed for', clip.name, err);
    } finally {
      clip.transcribing = false;
    }
  }
}
