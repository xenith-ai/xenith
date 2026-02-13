import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class HttpHandlerService {
  /**
   * @param onProgress Optional callback with (loadedBytes, totalBytes?) for progress. totalBytes may be missing if unknown.
   */
  public async fetchOctetStream(
    url: string,
    onProgress?: (loaded: number, total?: number) => void
  ): Promise<Uint8Array> {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        onDownloadProgress: (event) => {
          if (onProgress && event.total) {
            onProgress(event.loaded, event.total);
          } else if (onProgress) {
            onProgress(event.loaded);
          }
        },
      });

      return new Uint8Array(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }
}
