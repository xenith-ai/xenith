import { Injectable, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

declare var window: any;

@Injectable({
  providedIn: 'root',
})
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | undefined;
  private chunks: Blob[] = [];
  private stream : MediaStream | undefined;
  private context: AudioContext | undefined;
  private audio: Float32Array | undefined;
  private audio0: Float32Array | undefined;
  private whisperInstance: any;

  private kSampleRate = 16000;
  private kIntervalAudio = 2;
  private kIntervalAudio_ms = this.kIntervalAudio * 1000;

  constructor(private http: HttpClient) {
  }

  async initRecording(): Promise<void> {
    try {

      // Set context
      if (!this.context) {
        this.context = new AudioContext({
          sampleRate: this.kSampleRate
        });
      }

      // Set media recorder
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = (event) => {
        this.chunks.push(event.data);

        const blob = new Blob(this.chunks, { type: 'audio/ogg; codecs=opus' });
        const reader = new FileReader();

        reader.onload = async (event) => {
          var buf = new Uint8Array(reader.result as ArrayBuffer);

          if (!this.context) {
            return;
          }

          // Set audio buffer from reader
          const audioBuffer = await this.context.decodeAudioData(buf.buffer);

          // Set offlineContext with specs from audio buffer
          var offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );

          // Set source from audio buffer
          var source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start(0);

          // Render audio buffer
          const renderedBuffer = await offlineContext.startRendering();
          this.audio = renderedBuffer.getChannelData(0);

          // Handle stream audio data
          var audioAll = new Float32Array(
            this.audio0 == null ? this.audio.length : this.audio0.length + this.audio.length
          );
          if (this.audio0 != null) {
            audioAll.set(this.audio0, 0);
          }
          audioAll.set(this.audio, this.audio0 == null ? 0 : this.audio0.length);

          if (this.whisperInstance && window.Module) {
            window.Module.set_audio(this.whisperInstance, audioAll);
          }
        };

        reader.readAsArrayBuffer(blob);
      };
    } catch (error) {
      console.error('Error accessing the microphone', error);
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.start(this.kIntervalAudio_ms);

      /*const intervalUpdate = setInterval(function() {
        var transcribed = window.Module.get_transcribed();
        //console.log(transcribed);
      }, 100);*/
    }
  }

  startListener() {
    const intervalUpdate = setInterval(() => {
      var transcribed = window.Module.get_transcribed();

      if (transcribed != '') {
        this.transcriptionDetected(transcribed);
      }
    }, 100);
  }

  transcriptionDetected(transcription: string) {
    console.log('TRANSCRIPTION: ' + transcription);
  }

  logTranscribed() {
    var transcribed = window.Module.get_transcribed();
    console.log(transcribed);
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

  async loadModel() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    const response = await this.fetchRemote('assets/whisper.wasm/models/ggml-model-whisper-tiny.en-q5_1.bin');
    window.Module.FS_createDataFile('/', 'whisper.bin', response, true, true);
  }

  async initializeWhisper(): Promise<void> {
    if (window.Module) {
      this.whisperInstance = window.Module.init('whisper.bin', this.kIntervalAudio);
      if (!this.whisperInstance) {
        console.log("Failed to initialize whisper");
        return;
      }
    }
  }

  async fetchRemote(url: any) {
    const response = await fetch(
        url,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
        }
    );

    if (!response.ok) {
        return;
    }

    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength!, 10);
    const reader = response.body ? response.body.getReader() : null;

    var chunks = [];
    var receivedLength = 0;
    var progressLast = -1;

    while (true) {
        if (reader) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          chunks.push(value);
          receivedLength += value.length;
        }

        if (contentLength) {
            var progressCur = Math.round((receivedLength / total) * 10);
            if (progressCur != progressLast) {
                progressLast = progressCur;
            }
        }
    }

    var position = 0;
    var chunksAll = new Uint8Array(receivedLength);

    for (var chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
    }

    return chunksAll;
  }
}
