import * as webllm from '@mlc-ai/web-llm';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LLMService {
  private engine: webllm.MLCEngineInterface | null = null;
  private initialized = false;
  private currentModel: string | null = null;
  private appConfig = webllm.prebuiltAppConfig;
  private testModel: string = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';

  constructor() {
    this.appConfig.useIndexedDBCache = true;
  }

  public async init(
    model = this.testModel,
    initProgressCallback?: (report: webllm.InitProgressReport) => void
  ): Promise<void> {
    if (this.initialized && this.currentModel === model) {
      console.log('[WebLLM] Already initialized with model:', model);
      return;
    }

    try {
      if (!this.initialized) {
        console.log('[WebLLM] Initializing worker and engine...');
        const worker = new Worker(new URL('../../workers/llm.worker.ts', import.meta.url), {
          type: 'module',
        });

        worker.onerror = (error) => {
          console.error('[LLM Worker Error]', error);
        };

        this.engine = await webllm.CreateWebWorkerMLCEngine(worker, model, {
          appConfig: this.appConfig,
          initProgressCallback,
        });

        this.initialized = true;
        this.currentModel = model;
        console.log('[WebLLM] Initialized successfully with model:', model);
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
   * @param progressCallback Optional callback for download/load progress (0-1).
   */
  public async ensureModel(
    model: string,
    progressCallback?: (report: webllm.InitProgressReport) => void
  ): Promise<void> {
    if (!this.engine) {
      await this.init(model, progressCallback);
      return;
    }

    if (this.currentModel === model) {
      return; // Already using this model
    }

    if (progressCallback) {
      this.engine.setInitProgressCallback(progressCallback);
    }
    try {
      await this.engine.reload(model);
      this.currentModel = model;
      console.log(`[WebLLM] Switched to model: ${model}`);
    } finally {
      if (progressCallback) {
        this.engine.setInitProgressCallback(() => {});
      }
    }
  }

  /** Human-readable model name for UI. */
  public getModelDisplayName(modelId: string): string {
    const names: Record<string, string> = {
      'gemma-2-2b-jpn-it-q4f16_1-MLC': 'Gemma 2 2B (Japanese)',
      'gemma-2-2b-it-q4f16_1-MLC': 'Gemma 2 2B',
      'gemma-2-9b-it-q4f16_1-MLC': 'Gemma 2 9B (Q4)',
      'Llama-3.1-8B-Instruct-q4f16_1-MLC': 'Llama 3.1 8B',
      'Llama-3.1-70B-Instruct-q4f16_1-MLC': 'Llama 3.1 70B',
      'Phi-3-mini-4k-instruct-q4f16_1-MLC': 'Phi-3 Mini',
      'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': 'Qwen2.5 0.5B',
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': 'Qwen2.5 1.5B',
      'Qwen2.5-3B-Instruct-q4f16_1-MLC': 'Qwen2.5 3B',
      'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC': 'TinyLlama 1.1B',
    };
    return names[modelId] ?? modelId;
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
      temperature: 0.701,
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
