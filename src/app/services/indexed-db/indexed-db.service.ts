import { Injectable } from '@angular/core';
import { ModelKey } from '../../enums/model-key.enum';
import { IndexedDBStore } from '../../enums/indexed-db-store.enum';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  private databaseName = 'xenith';
  private databaseInitialized = false;
  private db: IDBDatabase | null = null;

  public async initializeDatabase() {
    await this.openDatabase(this.databaseName, 1);
  }

  public async insertModel(key: ModelKey, value: Uint8Array) {
    if (!this.databaseInitialized) {
      await this.initializeDatabase();
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(
        IndexedDBStore.Models,
        'readwrite'
      );
      const store = transaction.objectStore(IndexedDBStore.Models);
      const request = store.put(value, key);

      request.onerror = () => {
        console.error('Error writing model:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
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
      const transaction = this.db!.transaction(
        IndexedDBStore.Models,
        'readonly'
      );
      const store = transaction.objectStore(IndexedDBStore.Models);
      const request = store.get(key);

      request.onerror = () => {
        console.error('Error reading string:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          console.log('No data found for key', key);
          resolve(undefined);
        }
      };
    });
  }

  private async openDatabase(name: string, version: number) {
    this.databaseInitialized = true;

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onupgradeneeded = () => {
        this.db = request.result;
        if (!this.db.objectStoreNames.contains(IndexedDBStore.Models)) {
          this.db.createObjectStore(IndexedDBStore.Models);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
    });
  }
}
