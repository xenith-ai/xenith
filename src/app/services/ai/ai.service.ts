import { Injectable } from '@angular/core';
import { AI } from '../../models/ai.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class AIService {
  constructor() {}

  public createAI() {
    return new AI(uuidv4(), 'xenith', 'assets/dev/miku.jpg');
  }
}
