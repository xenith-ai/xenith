import { Injectable } from '@angular/core';
import { IndexedDBService } from '../indexed-db/indexed-db.service';
import { ModelKey } from '../../enums/model-key.enum';
import { WhisperSegment } from '../../models/whisper-segment.model';

declare let window: any;

const WHISPER_SAMPLE_RATE = 16000;
const MODEL_BIN_ID = 'whisper.bin';

export interface WhisperOneShotResult {
  transcription: string;
  segments: WhisperSegment[];
}

@Injectable({
  providedIn: 'root',
})
export class WhisperOneShotService {
  private oneShotModule: any = null;
  private oneShotInstance: number = 0;

  constructor(private indexedDB: IndexedDBService) {}

  /** Load main.js script if not already on window. */
  loadScript(): Promise<void> {
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

  private async getModule(): Promise<any> {
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
    const mod = await this.getModule();
    if (this.oneShotInstance) return;

    const model = await this.indexedDB.readModel(ModelKey.WhisperTinyEn);
    if (!model) throw new Error('Whisper model not found. Download it from the Chat / landing page first.');

    if (!mod.FS_createDataFile) throw new Error('Whisper module has no FS_createDataFile');
    mod.FS_createDataFile('/', MODEL_BIN_ID, model, true, true);

    const index = await mod.init(MODEL_BIN_ID);
    if (!index) throw new Error('Whisper init failed');
    this.oneShotInstance = index;
  }

  /** Decode audio from ArrayBuffer to 16 kHz mono Float32 PCM (resamples if needed). */
  async decodeTo16kMono(arrayBuffer: ArrayBuffer): Promise<Float32Array> {
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

  /** Run one-shot Whisper on PCM and return parsed transcription + segments. */
  async transcribe(pcmF32: Float32Array): Promise<WhisperOneShotResult> {
    await this.loadScript();
    await this.ensureModelAndInit();
    const mod = await this.getModule();
    const nthreads = Math.min(8, navigator.hardwareConcurrency || 4);
    const raw = mod.full_default(this.oneShotInstance, pcmF32, 'en', nthreads, false);
    const result = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const parsed = JSON.parse(result) as { status: number; segments?: WhisperSegment[] };
    if (parsed.status !== 0) {
      throw new Error(`Whisper failed (status ${parsed.status})`);
    }
    const segments = parsed.segments ?? [];
    const transcription = segments.map((s) => s.text).join('').replace(/\s+/g, ' ').trim();
    return { transcription, segments };
  }
}
