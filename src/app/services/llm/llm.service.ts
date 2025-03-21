import { Injectable } from '@angular/core';
import { IndexedDBService } from '../indexed-db/indexed-db.service';
import { ModelKey } from '../../enums/model-key.enum';

@Injectable({
  providedIn: 'root',
})
export class LLMService {
  private workers: Map<string, Worker> = new Map(); // Stores WebLLM workers
  private modelCache: Map<string, boolean> = new Map(); // Caches loaded models

  constructor(private indexedDBService: IndexedDBService) {}

  /**
   * Initialize a worker for a given model.
   * @param modelName The name of the model to use.
   */
  async initWorker(modelName: string): Promise<void> {
    if (this.workers.has(modelName)) {
      console.log(`Worker for ${modelName} already initialized.`);
      return;
    }

    /*const worker = new Worker(new URL('../worker/webllm.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event) => {
      console.log(`Worker ${modelName} response:`, event.data);
    };

    this.workers.set(modelName, worker);*/
    console.log(`Worker for ${modelName} initialized.`);
  }

  /**
   * Load a model using a worker.
   * @param modelName The name of the model.
   */
  async loadModel(modelName: string): Promise<void> {
    if (this.modelCache.has(modelName)) {
      console.log(`Model ${modelName} is already cached.`);
      return;
    }

    await this.initWorker(modelName);
    const worker = this.workers.get(modelName);

    if (!worker) {
      throw new Error(`Worker for ${modelName} is not initialized.`);
    }

    // Check if the model is in IndexedDB
    const cachedModel = await this.indexedDBService.readModel(modelName as ModelKey);
    if (cachedModel) {
      console.log(`Model ${modelName} loaded from IndexedDB.`);
      this.modelCache.set(modelName, true);
      worker.postMessage({ action: 'loadModel', model: cachedModel });
      return;
    }

    return new Promise((resolve, reject) => {
      worker.onmessage = async (event) => {
        if (event.data.status === 'loaded') {
          this.modelCache.set(modelName, true);
          console.log(`Model ${modelName} loaded and cached.`);
          await this.indexedDBService.insertModel(modelName as ModelKey, event.data.model);
          resolve();
        }
      };

      worker.onerror = (error) => {
        console.error(`Error loading model ${modelName}:`, error);
        reject(error);
      };

      worker.postMessage({ action: 'loadModel', model: modelName });
    });
  }

  /**
   * Perform a chat completion.
   * @param modelName The model to use.
   * @param inputText The input text.
   * @returns The response from the model.
   */
  async chatCompletion(modelName: string, inputText: string): Promise<string> {
    await this.loadModel(modelName);

    const worker = this.workers.get(modelName);
    if (!worker) {
      throw new Error(`Worker for ${modelName} is not initialized.`);
    }

    return new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        if (event.data.response) {
          resolve(event.data.response);
        }
      };

      worker.onerror = (error) => {
        console.error(`Error in chat completion for ${modelName}:`, error);
        reject(error);
      };

      worker.postMessage({
        action: 'chatCompletion',
        model: modelName,
        messages: [{ role: 'user', content: inputText }],
      });
    });
  }

  /**
   * Dispose of a worker when no longer needed.
   * @param modelName The model to unload.
   */
  disposeWorker(modelName: string): void {
    if (this.workers.has(modelName)) {
      this.workers.get(modelName)?.terminate();
      this.workers.delete(modelName);
      this.modelCache.delete(modelName);
      console.log(`Worker for ${modelName} disposed.`);
    }
  }
}
