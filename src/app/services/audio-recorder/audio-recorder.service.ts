import { Injectable } from '@angular/core';
import { Transcription } from '../../models/transcription.model';
import { Utilities } from '../../helpers/utilities';

declare let window: any;

@Injectable({
  providedIn: 'root',
})
export class AudioRecorderService {
  public microphoneAccess = false;
  public listening = false;

  public transcriptionCallback?: (transcription: Transcription) => void;

  private mediaRecorder: MediaRecorder | undefined;
  private chunks: Blob[] = [];
  private stream: MediaStream | undefined;
  private context: AudioContext | undefined;
  private audio: Float32Array | undefined;
  private whisperInstance: any;

  private readonly kSampleRate = 16000;
  private readonly kIntervalAudio = 2;
  private readonly kIntervalAudio_ms = this.kIntervalAudio * 1000;

  private whisperInitialized = false;

  /**
   * Requests microphone access from the user and sets the stream. If already granted, it will not prompt the user.
   */
  public async requestMicrophoneAccess(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (error) {
      console.error('Error requesting microphone access: ', error);
    }
  }

  /**
   * Performs the following:
   * 1. Request microphone access (will not prompt user if already granted).
   * 2. Initialize Whisper (if not already initialized).
   * 3. Wait for listening to start.
   * 4. Initialize MediaRecorder to start recording microphone audio.
   * 5. Start polling Whisper for transcriptions.
   * @param listeningCallback Callback function to execute when listening has started.
   */
  public async startListening(listeningCallback: () => void): Promise<void> {
    try {
      await this.requestMicrophoneAccess();

      if (await this.isMicrophoneEnabled(() => {})) {
        this.microphoneAccess = true;
      } else {
        this.microphoneAccess = false;
        console.error('Microphone access is not granted.');
        return;
      }

      if (!this.whisperInitialized) {
        await this.initWhisper();
      }

      // TODO: make callback options
      // Probably do this for other callback params in project as well
      await this.waitForListening(listeningCallback);
      await this.initMediaRecorder();
      await this.startPollingWhisper();
    } catch (error) {
      console.error('Error starting to listen: ', error);
    }
  }

  /**
   * TODO: Implement this method to stop listening and handle anything else associated.
   */
  public stopListening() {
    this.mediaRecorder?.stop();
    this.listening = false;
  }

  /**
   * Returns whether microphone access is granted.
   * @param microphoneStatusChangedCallback Callback function to execute when microphone status changes.
   * @returns True if microphone access is granted, false if denied, and undefined if permissions API is not supported.
   */
  public async isMicrophoneEnabled(
    microphoneStatusChangedCallback: (permissionStatus: PermissionStatus) => any
  ): Promise<boolean | undefined> {
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            this.microphoneAccess = true;
          } else {
            this.microphoneAccess = false;
          }

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

  /**
   * Loads the Whisper model into the browser's filesystem.
   * @param model Uint8Array containing the model data.
   */
  public async loadModel(model?: Uint8Array): Promise<void> {
    try {
      console.log('Loading model...');
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      window.OfflineAudioContext =
        window.OfflineAudioContext || window.webkitOfflineAudioContext;

      if (!model) {
        console.error('Model data is undefined.');
        return;
      }

      await window.Module.FS_createDataFile(
        '/',
        'whisper.bin',
        model,
        true,
        true
      );
      console.log('Model loaded successfully.');
    } catch (error) {
      console.error('Error loading model: ', error);
    }
  }

  /**
   * Initializes the AudioContext if it is not already initialized.
   */
  private initializeAudioContext(): void {
    if (!this.context) {
      this.context = new AudioContext({
        sampleRate: this.kSampleRate,
      });
    }
  }

  /**
   * Initializes the AudioContext if it is not already initialized.
   */
  private async initMediaRecorder(): Promise<void> {
    try {
      if (!this.stream) {
        throw new Error(
          'No stream available for MediaRecorder initialization.'
        );
      }

      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = this.handleDataAvailable;
      this.mediaRecorder.start(this.kIntervalAudio_ms);
    } catch (error) {
      console.error('Error initializing MediaRecorder: ', error);
    }
  }

  /**
   * Handles the data available event from the MediaRecorder.
   * @param event BlobEvent containing the audio data.
   */
  private handleDataAvailable = async (event: BlobEvent): Promise<void> => {
    this.chunks.push(event.data);
    const blob = new Blob(this.chunks, { type: 'audio/ogg; codecs=opus' });
    this.processAudioBlob(blob);
  };

  /**
   * Processes the audio data from the BlobEvent.
   * @param blob Blob containing the audio data.
   */
  private async processAudioBlob(blob: Blob): Promise<void> {
    const reader = new FileReader();

    reader.onloadend = async () => {
      const buffer = new Uint8Array(reader.result as ArrayBuffer);
      await this.processAudioBuffer(buffer);
    };

    reader.readAsArrayBuffer(blob);
  }

  /**
   * Processes the audio data from the Uint8Array and provides it to Whisper for transcription.
   * @param buffer Uint8Array containing the audio data.
   */
  private async processAudioBuffer(buffer: Uint8Array): Promise<void> {
    try {
      if (!this.context) {
        this.initializeAudioContext();
      }
      const audioBuffer = await this.context!.decodeAudioData(buffer.buffer);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      const renderedBuffer = await offlineContext.startRendering();
      this.audio = renderedBuffer.getChannelData(0);

      if (!this.whisperInstance) {
        console.error('Whisper instance is not initialized.');
        return;
      }

      if (!window.Module) {
        console.error('Module is not defined');
        return;
      }

      if (!window.Module.set_audio) {
        console.error('set_audio is not defined');
        return;
      }

      await window.Module.set_audio(this.whisperInstance, this.audio);
    } catch (error) {
      console.error('Error processing audio buffer: ', error);
    }
  }

  /**
   * Polls Whisper for transcriptions, processes them, and calls the transcription callback. Will continue to poll while listening is true.
   */
  private async startPollingWhisper(): Promise<void> {
    while (this.listening) {
      await Utilities.sleep(100);

      if (!this.whisperInstance) {
        console.error('Whisper instance is not initialized.');
        continue;
      }

      if (!window.Module) {
        console.error('Module is not defined');
        continue;
      }

      if (!window.Module.get_transcribed) {
        console.error('set_audio is not defined');
        continue;
      }

      const transcribed = await window.Module.get_transcribed();
      this.transcriptionDetected(transcribed);
    }
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

  private async initWhisper(): Promise<void> {
    while (!this.whisperInitialized) {
      if (window.Module?.init) {
        this.whisperInstance = await window.Module.init(
          'whisper.bin',
          this.kIntervalAudio
        );

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

  /**
   * Waits for listening to start by checking if the Whisper functions are available.
   * @param whisperListeningCallback Callback function to execute when listening has started.
   */
  private async waitForListening(
    whisperListeningCallback: () => void
  ): Promise<void> {
    while (!this.listening) {
      if (window.Module?.get_transcribed && window.Module?.set_audio) {
        console.log(
          'Module.get_transcribed and Module.set_audio are available'
        );

        whisperListeningCallback();
        this.listening = true;
      }

      await Utilities.sleep(100);
    }
  }
}
