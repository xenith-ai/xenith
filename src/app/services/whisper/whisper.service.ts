import { Injectable } from '@angular/core';
import { Utilities } from '../../helpers/utilities';
import { Transcription } from '../../models/transcription.model';

declare let window: any;

@Injectable({
  providedIn: 'root',
})
export class WhisperService {
  private readonly modelBinId = 'whisper.bin';

  public whisperModule: any | null = null;
  public whisperInstance: any | null = null;

  private polling: boolean = false;

  public transcriptionCallback:
    | ((transcription: Transcription) => void)
    | null = null;

  constructor() {
    this.loadModule();
  }

  public async waitForModule() {
    while (!this.whisperModule) {
      await Utilities.sleep(100);
    }
  }

  public async processAudioBuffer(audio: Float32Array, isFinalFrame: boolean): Promise<void> {
    try {
      if (!this.whisperModule) {
        throw new Error('Whisper module is not loaded.');
      }

      if (!this.whisperModule.set_audio) {
        throw new Error('Whisper module set_audio function is not available.');
      }

      if (!this.whisperInstance) {
        throw new Error('Whisper instance is not initialized.');
      }

      await this.whisperModule.set_audio(this.whisperInstance, audio, isFinalFrame);
    } catch (error) {
      console.error('Error processing audio buffer: ', error);
    }
  }

  private async loadModule(): Promise<void> {
    try {
      console.log('Loading Whisper module...');

      this.whisperModule = await (window as any).WhisperModule();

      if (this.whisperModule) {
        console.log('Whisper module loaded successfully.');
      } else {
        throw new Error('Whisper module is undefined.');
      }
    } catch (error) {
      console.error('Error loading Whisper module: ', error);
    }
  }

  public async loadModel(model: Uint8Array): Promise<void> {
    try {
      console.log('Loading whisper model...');

      if (!this.whisperModule) {
        throw new Error('Whisper module is not loaded.');
      }

      if (!this.whisperModule.FS_createDataFile) {
        throw new Error(
          'Whisper module FS_createDataFile function is not available.'
        );
      }

      // TODO: Are these necessary to be set here?
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      window.OfflineAudioContext =
        window.OfflineAudioContext || window.webkitOfflineAudioContext;

      await this.whisperModule.FS_createDataFile(
        '/',
        this.modelBinId,
        model,
        true,
        true
      );
      console.log('Model loaded successfully.');
    } catch (error) {
      console.error('Error loading Whisper model: ', error);
    }
  }

  public async initWhisper() {
    await this.initInstance();
    this.startPolling();
  }

  private async initInstance(): Promise<void> {
    try {
      if (!this.whisperModule) {
        throw new Error('Whisper module is not loaded.');
      }

      if (!this.whisperModule.init) {
        throw new Error('Whisper module init function is not available.');
      }

      this.whisperInstance = await this.whisperModule.init(
        this.modelBinId
      );

      if (this.whisperInstance) {
        console.log('Whisper instance initialized successfully.');
      } else {
        throw new Error('Whisper instance is undefined.');
      }
    } catch (error) {
      console.error('Error initializing Whisper instance: ', error);
    }
  }

  private async startPolling(): Promise<void> {
    if (this.polling) {
      return;
    }

    this.polling = true;
    while (this.polling) {
      await Utilities.sleep(100);

      if (!this.whisperInstance) {
        console.error('Whisper instance is not initialized.');
        continue;
      }

      if (!this.whisperModule) {
        console.error('Module is not defined');
        continue;
      }

      if (!this.whisperModule.get_transcribed) {
        console.error('get_transcribed is not defined');
        continue;
      }

      const transcribed = await this.whisperModule.get_transcribed();
      if (transcribed) {
        this.transcriptionDetected(transcribed);
      }
    }
  }

  private stopPolling() {
    this.polling = false;
  }

  /**
   * Processes the transcription from Whisper and calls the transcription callback.
   * @param transcription Transcription string from Whisper.
   */
  private transcriptionDetected(transcription: string): void {
    const filteredTranscription = this.removeDescriptions(transcription);
    const indexableTranscription = this.makeIndexable(
      filteredTranscription
    ).toLowerCase();

    const transcriptionContainer = new Transcription(
      indexableTranscription,
      filteredTranscription
    );

    if (this.transcriptionCallback) {
      this.transcriptionCallback(transcriptionContainer);
    }
  }

  /**
   * Remove nonsense like [BLANK_AUDIO] and (inaudible) from transcription.
   * @param transcription Transcription string from Whisper.
   */
  private removeDescriptions(transcription: string): string {
    return transcription
      .replace(/(\(.*?\))|(\[(?!BLANK AUDIO).*?\])|[[\]()]/g, '')
      .trim();
  }

  /**
   * Remove anything other than letters and spaces and make lowercase, so we have a nicely searchable string of pure words.
   * @param transcription Transcription string from Whisper.
   */
  private makeIndexable(transcription: string): string {
    return transcription
      .replace(/[^a-zA-Z ]/g, '')
      .toLowerCase()
      .trim();
  }
}
