import * as webllm from '@mlc-ai/web-llm';
import { Injectable } from '@angular/core';

/** Display names for all WebLLM models (used in UI). */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // Llama
  'Llama-3.2-1B-Instruct-q4f32_1-MLC': 'Llama 3.2 1B (Q4 f32)',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': 'Llama 3.2 1B',
  'Llama-3.2-1B-Instruct-q0f16-MLC': 'Llama 3.2 1B (Q0)',
  'Llama-3.2-3B-Instruct-q4f32_1-MLC': 'Llama 3.2 3B (Q4 f32)',
  'Llama-3.2-3B-Instruct-q4f16_1-MLC': 'Llama 3.2 3B',
  'Llama-3.1-8B-Instruct-q4f32_1-MLC-1k': 'Llama 3.1 8B 1k (Q4 f32)',
  'Llama-3.1-8B-Instruct-q4f16_1-MLC-1k': 'Llama 3.1 8B 1k',
  'Llama-3.1-8B-Instruct-q4f32_1-MLC': 'Llama 3.1 8B (Q4 f32)',
  'Llama-3.1-8B-Instruct-q4f16_1-MLC': 'Llama 3.1 8B',
  'Llama-3.1-70B-Instruct-q3f16_1-MLC': 'Llama 3.1 70B (Q3)',
  'Llama-3-8B-Instruct-q4f32_1-MLC-1k': 'Llama 3 8B 1k (Q4 f32)',
  'Llama-3-8B-Instruct-q4f16_1-MLC-1k': 'Llama 3 8B 1k',
  'Llama-3-8B-Instruct-q4f32_1-MLC': 'Llama 3 8B (Q4 f32)',
  'Llama-3-8B-Instruct-q4f16_1-MLC': 'Llama 3 8B',
  'Llama-3-70B-Instruct-q3f16_1-MLC': 'Llama 3 70B (Q3)',
  'Llama-2-7b-chat-hf-q4f32_1-MLC-1k': 'Llama 2 7B 1k (Q4 f32)',
  'Llama-2-7b-chat-hf-q4f16_1-MLC-1k': 'Llama 2 7B 1k',
  'Llama-2-7b-chat-hf-q4f32_1-MLC': 'Llama 2 7B (Q4 f32)',
  'Llama-2-7b-chat-hf-q4f16_1-MLC': 'Llama 2 7B',
  'Llama-2-13b-chat-hf-q4f16_1-MLC': 'Llama 2 13B',
  // DeepSeek
  'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC': 'DeepSeek R1 Distill Qwen 7B',
  'DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC': 'DeepSeek R1 Distill Qwen 7B (f32)',
  'DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC': 'DeepSeek R1 Distill Llama 8B (f32)',
  'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC': 'DeepSeek R1 Distill Llama 8B',
  // Hermes
  'Hermes-2-Theta-Llama-3-8B-q4f16_1-MLC': 'Hermes 2 Theta Llama 3 8B',
  'Hermes-2-Theta-Llama-3-8B-q4f32_1-MLC': 'Hermes 2 Theta Llama 3 8B (f32)',
  'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC': 'Hermes 2 Pro Llama 3 8B',
  'Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC': 'Hermes 2 Pro Llama 3 8B (f32)',
  'Hermes-3-Llama-3.2-3B-q4f32_1-MLC': 'Hermes 3 Llama 3.2 3B (f32)',
  'Hermes-3-Llama-3.2-3B-q4f16_1-MLC': 'Hermes 3 Llama 3.2 3B',
  'Hermes-3-Llama-3.1-8B-q4f32_1-MLC': 'Hermes 3 Llama 3.1 8B (f32)',
  'Hermes-3-Llama-3.1-8B-q4f16_1-MLC': 'Hermes 3 Llama 3.1 8B',
  'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC': 'Hermes 2 Pro Mistral 7B',
  'OpenHermes-2.5-Mistral-7B-q4f16_1-MLC': 'OpenHermes 2.5 Mistral 7B',
  'NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC': 'NeuralHermes 2.5 Mistral 7B',
  // Qwen3
  'Qwen3-0.6B-q4f16_1-MLC': 'Qwen3 0.6B',
  'Qwen3-0.6B-q4f32_1-MLC': 'Qwen3 0.6B (f32)',
  'Qwen3-0.6B-q0f16-MLC': 'Qwen3 0.6B (Q0)',
  'Qwen3-1.7B-q4f16_1-MLC': 'Qwen3 1.7B',
  'Qwen3-1.7B-q4f32_1-MLC': 'Qwen3 1.7B (f32)',
  'Qwen3-4B-q4f16_1-MLC': 'Qwen3 4B',
  'Qwen3-4B-q4f32_1-MLC': 'Qwen3 4B (f32)',
  'Qwen3-8B-q4f16_1-MLC': 'Qwen3 8B',
  'Qwen3-8B-q4f32_1-MLC': 'Qwen3 8B (f32)',
  // Qwen2.5
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': 'Qwen2.5 0.5B',
  'Qwen2.5-0.5B-Instruct-q4f32_1-MLC': 'Qwen2.5 0.5B (f32)',
  'Qwen2.5-0.5B-Instruct-q0f16-MLC': 'Qwen2.5 0.5B (Q0)',
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': 'Qwen2.5 1.5B',
  'Qwen2.5-1.5B-Instruct-q4f32_1-MLC': 'Qwen2.5 1.5B (f32)',
  'Qwen2.5-3B-Instruct-q4f16_1-MLC': 'Qwen2.5 3B',
  'Qwen2.5-3B-Instruct-q4f32_1-MLC': 'Qwen2.5 3B (f32)',
  'Qwen2.5-7B-Instruct-q4f16_1-MLC': 'Qwen2.5 7B',
  'Qwen2.5-7B-Instruct-q4f32_1-MLC': 'Qwen2.5 7B (f32)',
  'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC': 'Qwen2.5 Coder 0.5B',
  'Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC': 'Qwen2.5 Coder 0.5B (f32)',
  'Qwen2.5-Coder-0.5B-Instruct-q0f16-MLC': 'Qwen2.5 Coder 0.5B (Q0)',
  'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC': 'Qwen2.5 Coder 1.5B',
  'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC': 'Qwen2.5 Coder 1.5B (f32)',
  'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC': 'Qwen2.5 Coder 3B',
  'Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC': 'Qwen2.5 Coder 3B (f32)',
  'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC': 'Qwen2.5 Coder 7B',
  'Qwen2.5-Coder-7B-Instruct-q4f32_1-MLC': 'Qwen2.5 Coder 7B (f32)',
  'Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC': 'Qwen2.5 Math 1.5B',
  'Qwen2.5-Math-1.5B-Instruct-q4f32_1-MLC': 'Qwen2.5 Math 1.5B (f32)',
  'Qwen2-0.5B-Instruct-q4f16_1-MLC': 'Qwen2 0.5B',
  'Qwen2-0.5B-Instruct-q0f16-MLC': 'Qwen2 0.5B (Q0)',
  'Qwen2-1.5B-Instruct-q4f16_1-MLC': 'Qwen2 1.5B',
  'Qwen2-1.5B-Instruct-q4f32_1-MLC': 'Qwen2 1.5B (f32)',
  'Qwen2-7B-Instruct-q4f16_1-MLC': 'Qwen2 7B',
  'Qwen2-7B-Instruct-q4f32_1-MLC': 'Qwen2 7B (f32)',
  'Qwen2-Math-1.5B-Instruct-q4f16_1-MLC': 'Qwen2 Math 1.5B',
  'Qwen2-Math-1.5B-Instruct-q4f32_1-MLC': 'Qwen2 Math 1.5B (f32)',
  'Qwen2-Math-7B-Instruct-q4f16_1-MLC': 'Qwen2 Math 7B',
  'Qwen2-Math-7B-Instruct-q4f32_1-MLC': 'Qwen2 Math 7B (f32)',
  // Phi
  'Phi-3.5-mini-instruct-q4f16_1-MLC': 'Phi 3.5 Mini',
  'Phi-3.5-mini-instruct-q4f32_1-MLC': 'Phi 3.5 Mini (f32)',
  'Phi-3.5-mini-instruct-q4f16_1-MLC-1k': 'Phi 3.5 Mini 1k',
  'Phi-3.5-mini-instruct-q4f32_1-MLC-1k': 'Phi 3.5 Mini 1k (f32)',
  'Phi-3.5-vision-instruct-q4f16_1-MLC': 'Phi 3.5 Vision',
  'Phi-3.5-vision-instruct-q4f32_1-MLC': 'Phi 3.5 Vision (f32)',
  'Phi-3-mini-4k-instruct-q4f16_1-MLC': 'Phi 3 Mini 4K',
  'Phi-3-mini-4k-instruct-q4f32_1-MLC': 'Phi 3 Mini 4K (f32)',
  'Phi-3-mini-4k-instruct-q4f16_1-MLC-1k': 'Phi 3 Mini 4K 1k',
  'Phi-3-mini-4k-instruct-q4f32_1-MLC-1k': 'Phi 3 Mini 4K 1k (f32)',
  'phi-2-q4f16_1-MLC': 'Phi 2',
  'phi-2-q4f32_1-MLC': 'Phi 2 (f32)',
  'phi-2-q4f16_1-MLC-1k': 'Phi 2 1k',
  'phi-2-q4f32_1-MLC-1k': 'Phi 2 1k (f32)',
  'phi-1_5-q4f16_1-MLC': 'Phi 1.5',
  'phi-1_5-q4f32_1-MLC': 'Phi 1.5 (f32)',
  'phi-1_5-q4f16_1-MLC-1k': 'Phi 1.5 1k',
  'phi-1_5-q4f32_1-MLC-1k': 'Phi 1.5 1k (f32)',
  // Gemma
  'gemma-2-2b-it-q4f16_1-MLC': 'Gemma 2 2B',
  'gemma-2-2b-it-q4f32_1-MLC': 'Gemma 2 2B (f32)',
  'gemma-2-2b-it-q4f16_1-MLC-1k': 'Gemma 2 2B 1k',
  'gemma-2-2b-it-q4f32_1-MLC-1k': 'Gemma 2 2B 1k (f32)',
  'gemma-2-9b-it-q4f16_1-MLC': 'Gemma 2 9B',
  'gemma-2-9b-it-q4f32_1-MLC': 'Gemma 2 9B (f32)',
  'gemma-2-2b-jpn-it-q4f16_1-MLC': 'Gemma 2 2B (Japanese)',
  'gemma-2-2b-jpn-it-q4f32_1-MLC': 'Gemma 2 2B Japanese (f32)',
  'gemma-2b-it-q4f16_1-MLC': 'Gemma 2B',
  'gemma-2b-it-q4f32_1-MLC': 'Gemma 2B (f32)',
  'gemma-2b-it-q4f16_1-MLC-1k': 'Gemma 2B 1k',
  'gemma-2b-it-q4f32_1-MLC-1k': 'Gemma 2B 1k (f32)',
  // Mistral & SmolLM
  'Mistral-7B-Instruct-v0.3-q4f16_1-MLC': 'Mistral 7B v0.3',
  'Mistral-7B-Instruct-v0.3-q4f32_1-MLC': 'Mistral 7B v0.3 (f32)',
  'Mistral-7B-Instruct-v0.2-q4f16_1-MLC': 'Mistral 7B v0.2',
  'WizardMath-7B-V1.1-q4f16_1-MLC': 'WizardMath 7B V1.1',
  'SmolLM2-1.7B-Instruct-q4f16_1-MLC': 'SmolLM2 1.7B',
  'SmolLM2-1.7B-Instruct-q4f32_1-MLC': 'SmolLM2 1.7B (f32)',
  'SmolLM2-360M-Instruct-q0f16-MLC': 'SmolLM2 360M (Q0)',
  'SmolLM2-360M-Instruct-q0f32-MLC': 'SmolLM2 360M (Q0 f32)',
  'SmolLM2-360M-Instruct-q4f16_1-MLC': 'SmolLM2 360M',
  'SmolLM2-360M-Instruct-q4f32_1-MLC': 'SmolLM2 360M (f32)',
  'SmolLM2-135M-Instruct-q0f16-MLC': 'SmolLM2 135M (Q0)',
  'SmolLM2-135M-Instruct-q0f32-MLC': 'SmolLM2 135M (Q0 f32)',
  'Ministral-3-3B-Base-2512-q4f16_1-MLC': 'Ministral 3 3B Base',
  'Ministral-3-3B-Reasoning-2512-q4f16_1-MLC': 'Ministral 3 3B Reasoning',
  'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC': 'Ministral 3 3B Instruct',
  // Other
  'stablelm-2-zephyr-1_6b-q4f16_1-MLC': 'StableLM 2 Zephyr 1.6B',
  'stablelm-2-zephyr-1_6b-q4f32_1-MLC': 'StableLM 2 Zephyr 1.6B (f32)',
  'stablelm-2-zephyr-1_6b-q4f16_1-MLC-1k': 'StableLM 2 Zephyr 1.6B 1k',
  'stablelm-2-zephyr-1_6b-q4f32_1-MLC-1k': 'StableLM 2 Zephyr 1.6B 1k (f32)',
  'RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC': 'RedPajama INCITE Chat 3B',
  'RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC': 'RedPajama INCITE Chat 3B (f32)',
  'RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC-1k': 'RedPajama INCITE Chat 3B 1k',
  'RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC-1k': 'RedPajama INCITE Chat 3B 1k (f32)',
  'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC': 'TinyLlama 1.1B v1.0',
  'TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC': 'TinyLlama 1.1B v1.0 (f32)',
  'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k': 'TinyLlama 1.1B v1.0 1k',
  'TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC-1k': 'TinyLlama 1.1B v1.0 1k (f32)',
  'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC': 'TinyLlama 1.1B v0.4',
  'TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC': 'TinyLlama 1.1B v0.4 (f32)',
  'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k': 'TinyLlama 1.1B v0.4 1k',
  'TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC-1k': 'TinyLlama 1.1B v0.4 1k (f32)',
};

@Injectable({ providedIn: 'root' })
export class LLMService {
  private engine: webllm.MLCEngineInterface | null = null;
  private initialized = false;
  private currentModel: string | null = null;
  private appConfig = webllm.prebuiltAppConfig;
  private testModel: string = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';

  /** When set, another caller is already initializing this model; await this to avoid duplicate inits. */
  private pendingInitPromise: Promise<void> | null = null;
  private modelBeingInited: string | null = null;

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

    if (this.modelBeingInited === model && this.pendingInitPromise) {
      await this.pendingInitPromise;
      return;
    }

    const runInit = async (): Promise<void> => {
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
          await this.ensureModel(model, initProgressCallback);
        }
      } finally {
        this.pendingInitPromise = null;
        this.modelBeingInited = null;
      }
    };

    this.modelBeingInited = model;
    this.pendingInitPromise = runInit();
    await this.pendingInitPromise;
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
    return MODEL_DISPLAY_NAMES[modelId] ?? modelId;
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
   * True if this model is currently being downloaded/initialized (another flow already started it).
   */
  public isModelInitInProgress(model: string): boolean {
    return this.modelBeingInited === model;
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

  /**
   * Unload the current model and release WebGPU/engine resources. Call when
   * deactivating listening to reduce memory use. Next use will require init() again.
   */
  public async unload(): Promise<void> {
    if (!this.engine) return;
    try {
      await this.engine.unload();
      console.log('[WebLLM] Unloaded model and released resources');
    } finally {
      this.engine = null;
      this.initialized = false;
      this.currentModel = null;
      this.pendingInitPromise = null;
      this.modelBeingInited = null;
    }
  }
}
