import { Injectable } from '@angular/core';
import { AudioProcessor } from '../../enums/audio-processor.enum';
import { WhisperService } from '../whisper/whisper.service';
import { Transcription } from '../../models/transcription.model';
import * as ort from 'onnxruntime-web';

/**
 * Audio Worklet sends data chunks here for processing with size/structure based on each
 * consumer's requirements, separated by event type identifier.
 *
 * These chunks are passed to each respective model's service for processing.
 *
 * We register each respective model's service callbacks with an arbitrary message,
 * in notifyAll(), which notifies all registered consumers.
 *
 * So, if we have multiple Assistants which are both running the same model (for example,
 * two Assistant want to process Whisper transcription but have different wake words), then
 * we can share the single Whisper processing stream for both Assistants.
 */
@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private readonly audioWorkletNodePath = '/assets/worklets/audio-processor.js';
  private readonly bufferSize: number = 1024;
  private readonly sampleRate: number = 16000;
  private readonly vadConfidenceThreshold: number = 0.5;
  /** Match worklet: 0.5s chunks at 16 kHz (same size as live VAD). */
  private readonly vadWindowSamples: number = this.sampleRate * 0.5;

  public processingStates: Map<AudioProcessor, boolean> = new Map();
  public listening: boolean = false;
  public microphoneAccess: boolean = false;
  private stream: MediaStream | undefined;
  private context: AudioContext | undefined;
  private vadSession: ort.InferenceSession | null = null;
  private audioWorkletNode: AudioWorkletNode | undefined;
  private previousWhisperBuffer: Float32Array | null = null;
  private vadJustStopped: boolean = false;
  private vadActive: boolean = false;

  private readonly registeredCallbacks: Map<
    AudioProcessor,
    Map<string, (message: any) => void>
  > = new Map();

  constructor(private whisperService: WhisperService) {
    whisperService.transcriptionCallback = (transcription: Transcription) => {
      this.notifyAll(transcription, AudioProcessor.Whisper);
    };
    this.initializeModelSessions();
  }

  /**
   * Initializes the model sessions for VAD.
   */
  private async initializeModelSessions() {
    if (this.vadSession) return;
    ort.env.wasm.wasmPaths = '/assets/onnx/';
    ort.env.wasm.numThreads = 1;
    this.vadSession = await ort.InferenceSession.create(
      '/assets/silero/silero_vad.onnx',
      {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: false,
        executionMode: 'sequential',
      }
    );
  }

  /**
   * Starts listening to the microphone input.
   * @returns {Promise<void>}
   */
  public async startListening(): Promise<void> {
    try {
      await this.requestMicrophoneAccess();
      if (await this.isMicrophoneEnabled(() => {})) {
        this.microphoneAccess = true;
      } else {
        this.microphoneAccess = false;
        console.error('Microphone access is not granted.');
        return;
      }
      await this.initAudioWorklet();
      this.listening = true;
    } catch (error) {
      throw new Error('Error starting to listen: ' + error);
    }
  }

  /**
   * Stops listening to the microphone input.
   */
  public stopListening(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    this.context?.close();
    this.context = undefined;
    this.audioWorkletNode?.port.close();
    this.audioWorkletNode = undefined;
    this.listening = false;
  }

  /**
   * Checks if the microphone is enabled.
   * @param microphoneStatusChangedCallback - Callback function to handle microphone status changes.
   * @returns {Promise<boolean | undefined>}
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
          this.microphoneAccess = permissionStatus.state === 'granted';
          microphoneStatusChangedCallback(permissionStatus);
        };
        return permissionStatus.state === 'granted';
      } catch (error) {
        throw new Error('Error querying microphone permissions: ' + error);
      }
    } else {
      throw new Error('Permissions API is not supported by your browser.');
    }
  }

  /**
   * Requests access to the microphone.
   * @returns {Promise<void>}
   */
  public async requestMicrophoneAccess(): Promise<void> {
    try {
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices API is not supported by your browser.');
      }
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } else {
        console.warn('Stream is already initialized');
      }
    } catch (error) {
      throw new Error('Error requesting microphone access: ' + error);
    }
  }

  /**
   * Registers a callback with a provided GUID and processor type.
   * @param guid - Unique identifier for the callback.
   * @param processor - The type of audio processor.
   * @param callback - The callback function to register.
   */
  public registerCallback(
    guid: string,
    processor: AudioProcessor,
    callback: (message: any) => void
  ) {
    if (!guid || typeof callback !== 'function') {
      throw new Error('Invalid GUID, processor type, or callback.');
    }
    let isFirstInstance = false;
    if (!this.registeredCallbacks.has(processor)) {
      this.registeredCallbacks.set(processor, new Map());
      isFirstInstance = true;
    }
    this.registeredCallbacks.get(processor)!.set(guid, callback);
    if (isFirstInstance) {
      this.startProcessor(processor);
    }
  }

  /**
   * Unregisters a callback using the provided GUID.
   * @param guid - Unique identifier for the callback.
   * @returns {boolean} - Returns true if the callback was removed, false otherwise.
   */
  public unregisterCallback(guid: string): boolean {
    let removed = false;
    this.registeredCallbacks.forEach((callbackMap, processor) => {
      if (callbackMap.has(guid)) {
        callbackMap.delete(guid);
        removed = true;
        if (callbackMap.size === 0) {
          this.registeredCallbacks.delete(processor);
          this.stopProcessor(processor);
        }
      }
    });
    return removed;
  }

  /**
   * Notifies all registered callbacks or optionally filters by processor type.
   * @param message - The message to send to the callbacks.
   * @param processorType - The type of audio processor.
   */
  private notifyAll(message: any, processorType: AudioProcessor): void {
    const callbacks = this.registeredCallbacks.get(processorType);
    if (callbacks) {
      callbacks.forEach((callback) => callback(message));
    }
  }

  /**
   * Called when the first instance of a processor type is registered.
   * @param processor - The type of audio processor.
   */
  private startProcessor(processor: AudioProcessor): void {
    console.log(`Starting processor: ${processor}`);
    this.processingStates.set(processor, true);
  }

  /**
   * Called when the last instance of a processor type is unregistered.
   * @param processor - The type of audio processor.
   */
  private stopProcessor(processor: AudioProcessor): void {
    console.log(`Stopping processor: ${processor}`);
    this.processingStates.set(processor, false);
  }

  /**
   * Initializes the AudioWorklet.
   * @returns {Promise<void>}
   */
  private async initAudioWorklet(): Promise<void> {
    try {
      if (!this.stream) {
        throw new Error('No stream available for AudioWorklet initialization.');
      }
      if (!this.context) {
        this.context = new AudioContext({ sampleRate: 16000 });
        await this.context.audioWorklet.addModule(this.audioWorkletNodePath);
        console.log('AudioContext initialized successfully');
      } else {
        console.warn('AudioContext is already initialized');
      }
      if (!this.audioWorkletNode) {
        const source = this.context.createMediaStreamSource(this.stream);
        this.audioWorkletNode = new AudioWorkletNode(
          this.context,
          'audio-processor'
        );
        source.connect(this.audioWorkletNode);
        this.audioWorkletNode.port.onmessage = async (event) => {
          if (event.data.type === 'vad') {
            await this.handleVAD(event.data.data);
          }
          if (event.data.type === 'whisper') {
            this.handleWhisper(event.data.data);
          }
        };
        console.log('AudioWorklet initialized successfully');
      } else {
        console.warn('AudioWorklet is already initialized');
      }
    } catch (error) {
      console.error('Error initializing AudioWorklet:', error);
    }
  }

  /**
   * Handles Voice Activity Detection (VAD) processing.
   * @param vadAudioBuffer - The audio buffer for VAD processing.
   */
  private async handleVAD(vadAudioBuffer: Float32Array) {
    if (!this.vadSession) {
      console.error('❌ VAD session is not initialized.');
      return;
    }
    const vadScore = await this.runVAD(vadAudioBuffer);
    const newVadState = vadScore > this.vadConfidenceThreshold;

    if (this.vadActive && !newVadState) {
      this.vadJustStopped = true;
    }

    this.vadActive = newVadState;
  }

  /**
   * Handles Whisper processing.
   * @param whisperAudioData - The audio data for Whisper processing.
   */
  private handleWhisper(whisperAudioData: Float32Array) {
    // Skip until Whisper is initialized (e.g. user went to chat without doing "Download AI Models" on landing)
    if (!this.whisperService.whisperInstance) {
      return;
    }
    if (this.vadActive) {
      // VAD just started, process previous audio buffer
      if (this.previousWhisperBuffer) {
        this.whisperService.processAudioBuffer(this.previousWhisperBuffer, false);
        this.previousWhisperBuffer = null;
      }

      // Process current audio buffer
      this.whisperService.processAudioBuffer(whisperAudioData, false);
    } else {
      // VAD just stopped, process one more audio buffer
      if (this.vadJustStopped) {
        this.whisperService.processAudioBuffer(whisperAudioData, true);
        this.vadJustStopped = false;
      }

      // VAD is not active, save the audio buffer for later
      this.previousWhisperBuffer = whisperAudioData;
    }
  }

  /**
   * Returns contiguous speech segments (start/end sample indices) for 16 kHz mono PCM.
   * Uses Silero VAD in 512-sample windows and merges adjacent speech windows.
   * Segments are padded slightly and short gaps are merged so Whisper gets natural chunks.
   */
  public async getSpeechSegments(
    pcm: Float32Array
  ): Promise<{ startSample: number; endSample: number }[]> {
    if (!this.vadSession) {
      await this.initializeModelSessions();
    }
    if (!this.vadSession) {
      throw new Error('❌ VAD session is not initialized.');
    }
    const W = this.vadWindowSamples;
    const paddingSamples = Math.min(512, Math.floor(this.sampleRate * 0.05)); // 50 ms pad
    const minSegmentSamples = Math.max(W, Math.floor(this.sampleRate * 0.2)); // at least 0.2 s
    const maxGapSamples = Math.floor(this.sampleRate * 0.25); // merge if gap < 0.25 s

    const numWindows = Math.ceil(pcm.length / W);
    const speechFlags: boolean[] = [];
    for (let i = 0; i < numWindows; i++) {
      const start = i * W;
      const end = Math.min(start + W, pcm.length);
      let chunk: Float32Array = pcm.slice(start, end);
      if (chunk.length < W) {
        const padded = new Float32Array(W);
        padded.set(chunk);
        chunk = padded;
      }
      const score = await this.runVAD(chunk);
      speechFlags.push(score > this.vadConfidenceThreshold);
    }

    const raw: { startSample: number; endSample: number }[] = [];
    let segStart: number | null = null;
    for (let i = 0; i < speechFlags.length; i++) {
      if (speechFlags[i]) {
        if (segStart === null) segStart = i * W;
      } else {
        if (segStart !== null) {
          raw.push({ startSample: segStart, endSample: (i + 1) * W });
          segStart = null;
        }
      }
    }
    if (segStart !== null) {
      raw.push({ startSample: segStart, endSample: numWindows * W });
    }

    const padded: { startSample: number; endSample: number }[] = raw.map(
      ({ startSample, endSample }) => ({
        startSample: Math.max(0, startSample - paddingSamples),
        endSample: Math.min(pcm.length, endSample + paddingSamples),
      })
    );

    const merged: { startSample: number; endSample: number }[] = [];
    for (const seg of padded) {
      const length = seg.endSample - seg.startSample;
      if (length < minSegmentSamples) continue;
      const last = merged[merged.length - 1];
      if (
        last &&
        seg.startSample - last.endSample <= maxGapSamples
      ) {
        last.endSample = seg.endSample;
      } else {
        merged.push({ ...seg });
      }
    }
    return merged;
  }

  /**
   * Runs Voice Activity Detection (VAD) on the audio buffer.
   * @param audioBuffer - The audio buffer for VAD processing.
   * @returns {Promise<number>} - The VAD score.
   */
  private async runVAD(audioBuffer: Float32Array): Promise<number> {
    if (!this.vadSession) {
      throw new Error('❌ VAD session is not initialized.');
    }
    const inputTensor = new ort.Tensor('float32', audioBuffer, [
      1,
      audioBuffer.length,
    ]);
    const sampleRateTensor = new ort.Tensor(
      'int64',
      new BigInt64Array([BigInt(16000)]),
      [1]
    );
    const hiddenStateTensor = new ort.Tensor(
      'float32',
      new Float32Array(2 * 64).fill(0),
      [2, 1, 64]
    );
    const cellStateTensor = new ort.Tensor(
      'float32',
      new Float32Array(2 * 64).fill(0),
      [2, 1, 64]
    );
    try {
      const outputMap = await this.vadSession.run({
        input: inputTensor,
        sr: sampleRateTensor,
        h: hiddenStateTensor,
        c: cellStateTensor,
      });
      const vadScore = outputMap[Object.keys(outputMap)[0]]
        .data as Float32Array;
      return vadScore[0];
    } catch (error) {
      console.error('❌ Error running VAD:', error);
      return 0;
    }
  }
}
