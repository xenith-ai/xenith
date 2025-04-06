import * as webllm from '@mlc-ai/web-llm';
import { Injectable } from '@angular/core';
import * as tts from '@diffusionstudio/vits-web';

@Injectable({ providedIn: 'root' })
export class LLMService {
  private engine: webllm.MLCEngineInterface | null = null;
  private initialized = false;
  private appConfig = webllm.prebuiltAppConfig;
  private testModel: string = 'gemma-2-2b-jpn-it-q4f16_1-MLC';

  constructor() {
    this.appConfig.useIndexedDBCache = true;
  }

  /**
   * Initialize the LLM engine with a given model.
   */
  public async init(model = this.testModel): Promise<void> {
    if (this.initialized) return;

    try {
      const worker = new Worker(new URL('../../workers/llm.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.engine = await webllm.CreateWebWorkerMLCEngine(worker, model, {
        appConfig: this.appConfig,
      });

      this.initialized = true;
    } catch (err) {
      console.error('[WebLLM Init Error]', err);
      throw err;
    }
  }

  /**
   * Standard single-response chat completion (non-streaming).
   */
  public async generateResponse(messages: webllm.ChatCompletionMessageParam[]): Promise<string> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    const result = await this.engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 256,
    });

    return result?.choices[0]?.message.content ?? '[empty]';
  }

  /**
   * Streaming response generation with token-by-token callback.
   */
  public async streamResponse(
    messages: webllm.ChatCompletionMessageParam[],
    onToken?: (token: string, usage?: webllm.CompletionUsage) => void
  ): Promise<void> {
    if (!this.engine) throw new Error('Engine not initialized');

    const request: webllm.ChatCompletionRequest = {
      stream: true,
      stream_options: { include_usage: true },
      messages,
      logprobs: true,
      top_logprobs: 2,
    };

    const stream = await this.engine.chat.completions.create(request);
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';

      if (onToken) {
        onToken(delta, chunk.usage);
      }
    }

    const messageOutput = await this.engine.getMessage();

    const wav = await tts.predict({
      text: this.filterMessage(messageOutput),
      voiceId: 'en_US-hfc_female-medium',
    });

    const audio = new Audio();
    audio.src = URL.createObjectURL(wav);
    audio.play();

    console.log('Final message:\n', messageOutput);
  }

  private filterMessage(message: string): string {
    // Remove emojis and special characters
    let filteredMessage = this.removeEmojis(message);

    // Remove asterisk characters
    filteredMessage = filteredMessage.replace(/\*/g, '');

    return filteredMessage;
  }

  private removeEmojis(str: string): string {
    return str.replace(
      /([\u{1F3FB}-\u{1F3FF}]|[\u{1F1E6}-\u{1F1FF}]{2}|[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}])/gu,
      ''
    );
  }

  /**
   * Interrupt streaming generation.
   */
  public interrupt(): void {
    this.engine?.interruptGenerate();
  }

  /**
   * Check if the model is already cached
   */
  public async isModelCached(model: string = this.testModel): Promise<boolean> {
    try {
      return await webllm.hasModelInCache(model, this.appConfig);
    } catch (err) {
      console.error('[WebLLM Cache Check Error]', err);
      return false;
    }
  }

  /**
   * Delete all cached data related to the model.
   */
  public async deleteModelCache(model: string = this.testModel): Promise<void> {
    try {
      await webllm.deleteModelAllInfoInCache(model, this.appConfig);
      console.log(`[Cache Cleared] ${model}`);
    } catch (err) {
      console.error('[WebLLM Cache Delete Error]', err);
    }
  }

  /**
   * Reload model weights (useful after cache is cleared or updated).
   */
  public async reloadModel(model: string): Promise<void> {
    if (!this.engine) throw new Error('Engine not initialized');
    await this.engine.reload(model);
    console.log(`[Model Reloaded] ${model}`);
  }
}
