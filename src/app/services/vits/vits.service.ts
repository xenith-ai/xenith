import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VitsService {
  private vitsWorker: Worker | null = null;
  private bufferString = '';
  private audioQueue: HTMLAudioElement[] = [];
  private isPlaying = false;
  private currentGuid: string | null = null;
  private finalCallback: (() => void) | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private voiceId: string = 'en_US-hfc_female-medium';

  constructor() {
    this.initVitsWorker();
  }

  public initVitsWorker(): void {
    try {
      this.vitsWorker = new Worker(new URL('../../workers/tts.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.vitsWorker.onmessage = (event: MessageEvent) => {
        const { type, wav, error, guid } = event.data;

        if (this.currentGuid !== guid) {
          console.warn(`[TTS] Ignoring stale audio for GUID ${guid}`);
          return;
        }

        if (type === 'tts-result') {
          const audio = new Audio();
          audio.src = URL.createObjectURL(wav);
          audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.currentAudio = null;
            this.playNextAudio();
          });

          this.audioQueue.push(audio);
          if (!this.isPlaying) {
            this.playNextAudio();
          }
        } else if (type === 'tts-error') {
          console.error('TTS worker error:', error);
          this.isPlaying = false;
          this.currentAudio = null;
          this.playNextAudio(); // Skip to next
        }
      };
    } catch (err) {
      console.error('[TTS Init Error]', err);
      throw err;
    }
  }

  public streamToken(token: string, guid: string, voiceId: string = this.voiceId): void {
    if (!this.vitsWorker) {
      throw new Error('TTS Worker not initialized');
    }

    if (this.currentGuid && this.currentGuid !== guid) {
      this.cancelCurrentStream();
    }
    this.currentGuid = guid;

    const cleanToken = this.filterMessage(token);
    if (!cleanToken.trim()) return;

    this.bufferString += cleanToken;

    if (/[.!?]["']?\s*$/.test(this.bufferString)) {
      const sentence = this.bufferString.trim();
      this.bufferString = '';

      this.vitsWorker.postMessage({
        messageOutput: sentence,
        voiceId,
        guid,
      });
    }
  }

  public complete(guid: string, voiceId: string = this.voiceId, onComplete?: () => void): void {
    if (this.currentGuid !== guid) return;

    if (this.bufferString.trim()) {
      const remaining = this.bufferString.trim();
      this.bufferString = '';

      this.vitsWorker?.postMessage({
        messageOutput: remaining,
        voiceId,
        guid,
      });
    }

    if (onComplete) {
      this.finalCallback = onComplete;
    }

    if (!this.isPlaying && this.audioQueue.length === 0) {
      this.finalCallback?.();
      this.finalCallback = null;
    }
  }

  public cancelCurrentStream(): void {
    this.bufferString = '';
    this.audioQueue = [];
    this.finalCallback = null;
    this.currentGuid = null;

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }

    this.isPlaying = false;
  }

  private playNextAudio(): void {
    if (this.audioQueue.length === 0) {
      if (this.finalCallback) {
        this.finalCallback();
        this.finalCallback = null;
      }
      return;
    }

    if (this.isPlaying) return;

    const nextAudio = this.audioQueue.shift();
    if (nextAudio) {
      this.currentAudio = nextAudio;
      this.isPlaying = true;
      nextAudio.play();
    }
  }

  private filterMessage(message: string): string {
    // Remove emojis and special characters
    let filteredMessage = this.removeEmojis(message);

    // Remove some characters we don't want read
    filteredMessage = filteredMessage.replace(/[\*:]/g, '');

    return filteredMessage;
  }

  private removeEmojis(str: string): string {
    return str.replace(
      /([\u{1F3FB}-\u{1F3FF}]|[\u{1F1E6}-\u{1F1FF}]{2}|[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}])/gu,
      ''
    );
  }
}
