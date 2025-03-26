import * as webllm from '@mlc-ai/web-llm';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LLMService {
  private engine: webllm.MLCEngineInterface | null = null;
  private initialized = false;
  private worker: Worker | null = null;
  private appConfig = webllm.prebuiltAppConfig;

  public async init(model = 'Llama-3.1-8B-Instruct-q4f32_1-MLC'): Promise<void> {
    this.appConfig.useIndexedDBCache = true;

    if (this.initialized) return;

    try {
      this.engine = await webllm.CreateWebWorkerMLCEngine(
        new Worker(new URL("../../workers/llm.worker.ts", import.meta.url), { type: "module" }),
        model,
        {
          appConfig: this.appConfig,
        },
      );
      this.initialized = true;
    } catch (err) {
      console.error('[WebLLM Init Error]', err);
      throw err;
    }
  }

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

  public async isModelCached(model = 'Llama-3.1-8B-Instruct-q4f32_1-MLC'): Promise<boolean> {
    this.appConfig.useIndexedDBCache = true;

    try {
      return await webllm.hasModelInCache(model, this.appConfig);
    } catch (err) {
      console.error('[WebLLM Cache Check Error]', err);
      return false;
    }
  }
}
