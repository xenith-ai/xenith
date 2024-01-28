import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class HttpHandlerService {
  async fetchOctetStream(url: string): Promise<ArrayBuffer> {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/octet-stream',
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error; // or handle it as per your application's needs
    }
  }
}
