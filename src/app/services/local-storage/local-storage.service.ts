import { Injectable } from '@angular/core';
import { ModelKey } from '../../enums/model-key.enum';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  public getWhisperModel(key: ModelKey): Uint8Array | null {
    const base64Model = localStorage.getItem(key);

    if (!base64Model) {
      return null;
    }

    return this.base64ToUint8Array(base64Model);
  }

  public saveWhisperModel(key: ModelKey, model: Uint8Array): void {
    const base64Model = this.uint8ArrayToBase64(model);
    console.log('Writing model to local storage', base64Model.length, 'bytes');
    localStorage.setItem(key, base64Model);
  }

  private uint8ArrayToBase64(buffer: Uint8Array): string {
    let binary = '';
    const chunkSize = 5000; // Process in chunks to avoid call stack size exceed error

    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = Array.from(buffer.subarray(i, i + chunkSize)); // Convert Uint8Array to array
      binary += String.fromCharCode.apply(null, chunk);
    }

    return window.btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }
}
