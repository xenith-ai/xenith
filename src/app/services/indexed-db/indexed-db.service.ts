import { Injectable } from '@angular/core';
import { ModelKey } from '../../enums/model-key.enum';
import { IndexedDBStore } from '../../enums/indexed-db-store.enum';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  databaseName = 'xenith';
  databaseInitialized = false;
  private db: IDBDatabase | null = null;

  public async initializeDatabase() {
    await this.openDatabase(this.databaseName, 1);
  }

  async openDatabase(name: string, version: number) {
    this.databaseInitialized = true;

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onerror = event => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onupgradeneeded = event => {
        this.db = request.result;
        if (!this.db.objectStoreNames.contains(IndexedDBStore.Models)) {
          this.db.createObjectStore(IndexedDBStore.Models);
        }
      };

      request.onsuccess = event => {
        this.db = request.result;
        resolve();
      };
    });
  }

  public async insertModel(key: ModelKey, value: Uint8Array) {
    if (!this.databaseInitialized) {
      await this.initializeDatabase();
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(IndexedDBStore.Models, 'readwrite');
      const store = transaction.objectStore(IndexedDBStore.Models);
      const request = store.put(value, key);

      request.onerror = event => {
        console.error('Error writing model:', request.error);
        reject(request.error);
      };

      request.onsuccess = event => {
        resolve();
      };
    });
  }

  public async readModel(key: string): Promise<Uint8Array | undefined> {
    if (!this.databaseInitialized) {
      await this.initializeDatabase();
    }

    return new Promise<Uint8Array | undefined>((resolve, reject) => {
      console.log(this.db);
      const transaction = this.db!.transaction(IndexedDBStore.Models, 'readonly');
      const store = transaction.objectStore(IndexedDBStore.Models);
      const request = store.get(key);

      request.onerror = event => {
        console.error('Error reading string:', request.error);
        reject(request.error);
      };

      request.onsuccess = event => {
        if (request.result) {
          resolve(request.result);
        } else {
          console.log('No data found for key', key);
          resolve(undefined);
        }
      };
    });
  }
}
