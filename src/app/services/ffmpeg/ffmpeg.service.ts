import { Injectable } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';

/** FFmpeg core version; use UMD build so worker can load it without blob URLs (blob URLs break webpack module resolution). */
const CORE_VERSION = '0.12.6';
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

@Injectable({
  providedIn: 'root',
})
export class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loadPromise: Promise<void> | null = null;

  async load(): Promise<void> {
    if (this.ffmpeg) return;
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }
    this.loadPromise = this.doLoad();
    await this.loadPromise;
  }

  private async doLoad(): Promise<void> {
    console.log('[FFmpegService] Loading FFmpeg core from CDN (direct URLs)...');
    this.ffmpeg = new FFmpeg();
    await this.ffmpeg.load({
      coreURL: `${CORE_BASE}/ffmpeg-core.js`,
      wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
    });
    console.log('[FFmpegService] FFmpeg loaded');
  }

  /**
   * Extract audio from a video file. Returns a WAV blob (48kHz mono). High sample rate
   * preserves quality; resampling to 16kHz for Whisper happens in the app for better timing.
   */
  async extractAudio(videoFile: File): Promise<Blob> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    const ext = this.getExtension(videoFile.name);
    const safeName = videoFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'video';
    const inputPath = `in_${safeName}.${ext}`;
    const outputPath = `out_${safeName}.wav`;

    try {
      console.log('[FFmpegService] Writing input', inputPath, 'then extracting audio...');
      const data = new Uint8Array(await videoFile.arrayBuffer());
      await this.ffmpeg.writeFile(inputPath, data);

      await this.ffmpeg.exec([
        '-y',
        '-i', inputPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '48000',
        '-ac', '1',
        outputPath,
      ]);

      const outData = await this.ffmpeg.readFile(outputPath);
      await this.ffmpeg.deleteFile(inputPath).catch(() => {});
      await this.ffmpeg.deleteFile(outputPath).catch(() => {});

      const blob = new Blob([outData as BlobPart], { type: 'audio/wav' });
      return blob;
    } catch (err) {
      console.error('[FFmpegService] extractAudio failed', { inputPath, outputPath }, err);
      throw err;
    }
  }

  private getExtension(name: string): string {
    const m = name.match(/\.([^/.]+)$/);
    return m ? m[1].toLowerCase() : 'mp4';
  }
}
