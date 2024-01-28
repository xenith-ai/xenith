import { Injectable } from '@angular/core';
import { LocalStorageKey } from '../../enums/local-storage-key.enum';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  public getWhisperModel(key: LocalStorageKey): Uint8Array | null {
    const base64Model = localStorage.getItem(key);

    if (!base64Model) {
      return null;
    }

    return this.base64ToUint8Array(base64Model);
  }

  public saveWhisperModel(key: LocalStorageKey, model: Uint8Array): void {
    const base64Model = this.uint8ArrayToBase64(model);
    localStorage.setItem(key, base64Model);
  }

  uint8ArrayToBase64(buffer: Uint8Array): string {
    const binary = String.fromCharCode.apply(null, Array.from(buffer));
    return window.btoa(binary);
  }

  base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }
}
