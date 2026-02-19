import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IndexedDBService } from '../../services/indexed-db/indexed-db.service';
import { ModelKey } from '../../enums/model-key.enum';

declare let window: any;

const WHISPER_SAMPLE_RATE = 16000;
const MODEL_BIN_ID = 'whisper.bin';

export interface WhisperSegment {
  text: string;
  t0: number;
  t1: number;
}

@Component({
  selector: 'app-video-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './video-page.component.html',
  styleUrl: './video-page.component.scss',
})
export class VideoPageComponent {
  processing = false;
  error: string | null = null;
  transcription: string | null = null;
  segments: WhisperSegment[] = [];

  private oneShotModule: any = null;
  private oneShotInstance: number = 0;

  constructor(private indexedDB: IndexedDBService) {}

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.error = null;
    this.transcription = null;
    this.segments = [];
    this.processing = true;
    input.value = '';

    try {
      await this.loadOneShotScript();
      const pcmF32 = await this.decodeAudioTo16kMono(file);
      const result = await this.transcribeWithOneShotWhisper(pcmF32);
      const parsed = JSON.parse(result) as {
        status: number;
        segments: Array< { text: string; t0: number; t1: number } >;
      };
      if (parsed.status !== 0) {
        this.error = `Transcription failed (status ${parsed.status})`;
        return;
      }
      this.segments = parsed.segments ?? [];
      this.transcription = this.segments.map((s) => s.text).join('').replace(/\s+/g, ' ').trim();
      console.log('Transcription:', this.transcription);
      console.log('Segments (word-level timings):', this.segments);
    } catch (err) {
      console.error('Video page transcribe error:', err);
      this.error = err instanceof Error ? err.message : 'Transcription failed';
    } finally {
      this.processing = false;
    }
  }

  private loadOneShotScript(): Promise<void> {
    if (window.WhisperModule) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/whisper/main.js';
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error('main.js not found. Copy main.js and libmain.worker.js (and libmain.wasm) to assets/whisper/.'));
      document.head.appendChild(script);
    });
  }

  private async getOneShotModule(): Promise<any> {
    if (this.oneShotModule) return this.oneShotModule;
    const Factory = window.WhisperModule;
    if (!Factory) throw new Error('WhisperModule not loaded. Load main.js first.');
    const base = 'assets/whisper';
    this.oneShotModule = await Factory({
      locateFile: (path: string) => {
        if (path.endsWith('.worker.js')) return `${base}/libmain.worker.js`;
        if (path.endsWith('.wasm')) return `${base}/libmain.wasm`;
        return `${base}/${path}`;
      },
    });
    return this.oneShotModule;
  }

  private async ensureModelAndInit(): Promise<void> {
    const mod = await this.getOneShotModule();
    if (this.oneShotInstance) return;

    const model = await this.indexedDB.readModel(ModelKey.WhisperTinyEn);
    if (!model) throw new Error('Whisper model not found. Download it from the Chat / landing page first.');

    if (!mod.FS_createDataFile) throw new Error('Whisper module has no FS_createDataFile');
    mod.FS_createDataFile('/', MODEL_BIN_ID, model, true, true);

    const index = await mod.init(MODEL_BIN_ID);
    if (!index) throw new Error('Whisper init failed');
    this.oneShotInstance = index;
  }

  private async transcribeWithOneShotWhisper(pcmF32: Float32Array): Promise<string> {
    await this.ensureModelAndInit();
    const mod = await this.getOneShotModule();
    const nthreads = Math.min(8, navigator.hardwareConcurrency || 4);
    const result = mod.full_default(this.oneShotInstance, pcmF32, 'en', nthreads, false);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  private async decodeAudioTo16kMono(file: File): Promise<Float32Array> {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const duration = decoded.duration;
    const numSamples = Math.round(duration * WHISPER_SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, numSamples, WHISPER_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }
}
