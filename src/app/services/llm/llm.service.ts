import * as webllm from '@mlc-ai/web-llm';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LLMService {
  private engine: webllm.MLCEngineInterface | null = null;
  private initialized = false;
  private currentModel: string | null = null;
  private appConfig = webllm.prebuiltAppConfig;
  private testModel: string = 'gemma-2-2b-jpn-it-q4f16_1-MLC';

  constructor() {
    this.appConfig.useIndexedDBCache = true;
  }

  public async init(model = this.testModel): Promise<void> {
    if (this.initialized && this.currentModel === model) return;

    try {
      if (!this.initialized) {
        const worker = new Worker(new URL('../../workers/llm.worker.ts', import.meta.url), {
          type: 'module',
        });

        this.engine = await webllm.CreateWebWorkerMLCEngine(worker, model, {
          appConfig: this.appConfig,
        });

        this.initialized = true;
        this.currentModel = model;
      } else if (this.currentModel !== model) {
        // Switch to a different model
        await this.ensureModel(model);
      }
    } catch (err) {
      console.error('[WebLLM Init Error]', err);
      throw err;
    }
  }

  /**
   * Ensures the specified model is loaded. Switches models if needed.
   */
  public async ensureModel(model: string): Promise<void> {
    if (!this.engine) {
      await this.init(model);
      return;
    }

    if (this.currentModel === model) {
      return; // Already using this model
    }

    try {
      await this.engine.reload(model);
      this.currentModel = model;
      console.log(`[WebLLM] Switched to model: ${model}`);
    } catch (err) {
      console.error('[WebLLM Model Switch Error]', err);
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
