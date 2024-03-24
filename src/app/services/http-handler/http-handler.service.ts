import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class HttpHandlerService {
  public async fetchOctetStream(url: string): Promise<Uint8Array> {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      return new Uint8Array(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }
}
