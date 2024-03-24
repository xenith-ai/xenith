import { Injectable } from '@angular/core';
import { Transcription } from '../../models/transcription.model';
import { Utilities } from '../../helpers/utilities';

declare var window: any;

@Injectable({
  providedIn: 'root',
})
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | undefined;
  private chunks: Blob[] = [];
  private stream: MediaStream | undefined;
  private context: AudioContext | undefined;
  private audio: Float32Array | undefined;
  private whisperInstance: any;
  public transcriptionCallback?: (transcription: Transcription) => void;

  private readonly kSampleRate = 16000;
  private readonly kIntervalAudio = 2;
  private readonly kIntervalAudio_ms = this.kIntervalAudio * 1000;

  public listening = false;
  private whisperInitialized = false;

  private whisperPollingInterval: any;

  public async requestMicrophoneAccess(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (error) {
      console.error('Error requesting microphone access: ', error);
    }
  }

  public async startListening(listeningCallback: Function): Promise<void> {
    try {
      await this.requestMicrophoneAccess();

      if (!this.whisperInitialized) {
        await this.initWhisper();
      }

      await this.waitForListening(listeningCallback);

      await this.initMediaRecorder();
      await this.startPollingWhisper();
    } catch (error) {
      console.error('Error starting to listen: ', error);
    }
  }

  private initializeAudioContext(): void {
    if (!this.context) {
      this.context = new AudioContext({
        sampleRate: this.kSampleRate,
      });
    }
  }

  private async initMediaRecorder(): Promise<void> {
    try {
      if (!this.stream) {
        throw new Error('No stream available for MediaRecorder initialization.');
      }

      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = this.handleDataAvailable;
      this.mediaRecorder.start(this.kIntervalAudio_ms);
    } catch (error) {
      console.error('Error initializing MediaRecorder: ', error);
    }
  }

  private handleDataAvailable = async (event: BlobEvent): Promise<void> => {
    this.chunks.push(event.data);
    const blob = new Blob(this.chunks, { type: 'audio/ogg; codecs=opus' });
    this.processAudioBlob(blob);
  }

  private async processAudioBlob(blob: Blob): Promise<void> {
    const reader = new FileReader();

    reader.onloadend = async () => {
      const buffer = new Uint8Array(reader.result as ArrayBuffer);
      await this.processAudioBuffer(buffer);
    };

    reader.readAsArrayBuffer(blob);
  }

  private async processAudioBuffer(buffer: Uint8Array): Promise<void> {
    try {
      if (!this.context) {
        this.initializeAudioContext();
      }
      const audioBuffer = await this.context!.decodeAudioData(buffer.buffer);

      var offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

      var source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      const renderedBuffer = await offlineContext.startRendering();
      this.audio = renderedBuffer.getChannelData(0);

      if (this.whisperInstance && window.Module) {
        await window.Module.set_audio(this.whisperInstance, this.audio);
      }
    } catch (error) {
      console.error('Error processing audio buffer: ', error);
    }
  }

  private startPollingWhisper(): void {
    this.whisperPollingInterval = setInterval(async () => {
      if (window.Module) {
        if (window.Module.get_transcribed) {
          var transcribed = await window.Module.get_transcribed();
          this.transcriptionDetected(transcribed);
        } else {
          console.error('get_transcribed is not defined');
        }
      } else {
        console.error('Module is not defined')
      }
    }, 100);
  }

  private transcriptionDetected(transcription: string): void {
    const filteredTranscription = this.removeDescriptions(transcription);
    const indexableTranscription = this.makeIndexable(filteredTranscription).toLowerCase();

    const transcriptionContainer = new Transcription(indexableTranscription, filteredTranscription);

    if (filteredTranscription || indexableTranscription) {
      console.log(transcriptionContainer);
    }

    if (this.transcriptionCallback) {
      this.transcriptionCallback(transcriptionContainer);
    }
  }

  private stopPollingWhisper(): void {
    clearInterval(this.whisperPollingInterval);
  }

  // Remove nonsense like [BLANK_AUDIO] and (inaudible) from transcription
  private removeDescriptions(transcription: string): string {
    return transcription.replace(/(\(.*?\))|(\[(?!BLANK AUDIO).*?\])|[\[\]()]/g, '').trim();
  }

  private makeIndexable(input: string): string {
    return input.replace(/[^a-zA-Z ]/g, "").toLowerCase();
  }

  private async initWhisper(): Promise<void> {
    while (!this.whisperInitialized) {
      if (window.Module?.init) {
        this.whisperInstance = await window.Module.init('whisper.bin', this.kIntervalAudio);

        if (this.whisperInstance) {
          this.whisperInitialized = true;
          console.log('Whisper instance initialized successfully.');
        } else {
          console.error('Failed to initialize whisper instance.');
          break; // Module.init is available but failed to initialize, give up
        }
      }

      await Utilities.sleep(100);
    }
  }

  private async waitForListening(whisperListeningCallback: Function): Promise<void> {
    while (!this.listening) {
      if (window.Module?.get_transcribed && window.Module?.set_audio) {
        console.log('Module.get_transcribed and Module.set_audio are available');

        whisperListeningCallback();
        this.listening = true;
      }

      await Utilities.sleep(100);
    }
  }

  public async loadModel(model?: Uint8Array): Promise<void> {
    try {
      console.log('Loading model...');
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

      if (!model) {
        console.error("Model data is undefined.");
        return;
      }

      await window.Module.FS_createDataFile('/', 'whisper.bin', model, true, true);
      console.log('Model loaded successfully.');
    } catch (error) {
      console.error('Error loading model: ', error);
    }
  }

  public async isMicrophoneEnabled(microphoneStatusChangedCallback: (permissionStatus: PermissionStatus) => any): Promise<boolean | undefined> {
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissionStatus.onchange = () => {
          microphoneStatusChangedCallback(permissionStatus);
        };
        return permissionStatus.state === 'granted';
      } catch (error) {
        console.error('Error querying microphone permissions: ', error);
        return undefined;
      }
    } else {
      console.log('Permissions API is not supported by your browser.');
      return undefined;
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (this.mediaRecorder) {
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.chunks, { type: 'audio/wav' });
          resolve(audioBlob);
        };
        this.mediaRecorder.stop();
      } else {
        reject('MediaRecorder not initialized');
      }
    });
  }
}
