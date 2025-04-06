import { Injectable } from '@angular/core';
import { Assistant } from '../../models/assistant.model';
import { AudioService } from '../audio/audio.service';
import { LLMService } from '../llm/llm.service';
import { v4 as uuidv4 } from 'uuid';
import { IChatParticipant } from '../../interfaces/chat-participant.interface';
import { VitsService } from '../vits/vits.service';

@Injectable({
  providedIn: 'root',
})
export class AssistantService {
  private assistants: Assistant[] = [];

  constructor(
    private audioService: AudioService,
    private llmService: LLMService,
    private vitsService: VitsService
  ) {}

  public createAssistant(
    name: string,
    avatar: string,
    wakeWord: string,
    user: IChatParticipant
  ): Assistant {
    const assistant = new Assistant(
      uuidv4(),
      name,
      avatar,
      wakeWord,
      this.audioService,
      this.llmService,
      user,
      this.vitsService
    );

    this.assistants.push(assistant);
    return assistant;
  }

  public getAssistants(): Assistant[] {
    return [...this.assistants];
  }

  public removeAssistant(id: string): void {
    const index = this.assistants.findIndex(a => a.id === id);
    if (index !== -1) {
      this.assistants[index].destroy();
      this.assistants.splice(index, 1);
    }
  }

  public clearAll(): void {
    this.assistants.forEach(a => a.destroy());
    this.assistants = [];
  }
}
