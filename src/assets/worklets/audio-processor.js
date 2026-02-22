class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = 16000;

    this.whisperBufferSize = this.sampleRate * 1; // 0.5s (Whisper)
    this.vadBufferSize = this.sampleRate * 0.5; // 0.5s (VAD)

    this.whisperBuffer = new Float32Array(this.whisperBufferSize);
    this.vadBuffer = new Float32Array(this.vadBufferSize);

    this.whisperOffset = 0;
    this.vadOffset = 0;
  }

  process(inputs, outputs, parameters) {
    if (inputs.length > 0) {
      const inputChannel = inputs[0][0];

      if (inputChannel) {
        for (let i = 0; i < inputChannel.length; i++) {
          if (this.vadOffset < this.vadBufferSize) {
            this.vadBuffer[this.vadOffset++] = inputChannel[i];
          }

          if (this.whisperOffset < this.whisperBufferSize) {
            this.whisperBuffer[this.whisperOffset++] = inputChannel[i];
          }

          if (this.vadOffset >= this.vadBufferSize) {
            this.port.postMessage({
              type: "vad",
              data: this.vadBuffer.slice()
            });
            this.vadOffset = 0;
          }

          if (this.whisperOffset >= this.whisperBufferSize) {
            this.port.postMessage({
              type: "whisper",
              data: this.whisperBuffer.slice()
            });
            this.whisperOffset = 0;
          }
        }
      }
    }
    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
