import { Injectable } from '@angular/core';
import { Assistant } from '../../models/assistant.model';
import { AudioService } from '../audio/audio.service';
import { LLMService } from '../llm/llm.service';
import { v4 as uuidv4 } from 'uuid';
import { IChatParticipant } from '../../interfaces/chat-participant.interface';
import { VitsService } from '../vits/vits.service';
import { UserService } from '../user/user.service';
import { Conversation } from '../../models/conversation.model';
import { TextMessage } from '../../models/text-message.model';
import { User } from '../../models/user.model';
import { VoiceId } from '@diffusionstudio/vits-web';

interface SerializableAssistant {
  id: string;
  name: string;
  avatar: string;
  wakeWord: string;
  modelId: string;
  voiceId: VoiceId;
  messageColor: string;
  messages: Array<{
    participant: {
      id: string;
      name: string;
      avatar: string;
      messageColor: string;
    };
    text: string;
    timestamp: string; // ISO string
  }>;
}

const STORAGE_KEY = 'xenith_assistants';

@Injectable({
  providedIn: 'root',
})
export class AssistantService {
  private assistants: Assistant[] = [];
  private userService: UserService;
  private saveTimeout: any = null;
  private readonly SAVE_DEBOUNCE_MS = 1000; // Save 1 second after last change

  constructor(
    private audioService: AudioService,
    private llmService: LLMService,
    private vitsService: VitsService,
    userService: UserService
  ) {
    this.userService = userService;
    this.loadAssistantsFromStorage();

    // Save before page unload (immediate, not debounced)
    window.addEventListener('beforeunload', () => {
      this.saveAssistantsToStorageImmediate();
    });
  }

  public createAssistant(
    name: string,
    avatar: string,
    wakeWord: string,
    user: IChatParticipant,
    modelId: string = 'gemma-2-2b-jpn-it-q4f16_1-MLC',
    persist: boolean = true
  ): Assistant {
    const assistant = new Assistant(
      uuidv4(),
      name,
      avatar,
      wakeWord,
      this.audioService,
      this.llmService,
      user,
      this.vitsService,
      modelId
    );

    // Set up callback to save when conversation changes (only if persisting)
    if (persist) {
      assistant.onConversationChanged = () => {
        this.saveAssistantsToStorage();
      };
      this.assistants.push(assistant);
      this.saveAssistantsToStorage();
    }

    return assistant;
  }

  public getAssistants(): Assistant[] {
    return [...this.assistants];
  }

  public getAssistantById(id: string): Assistant | undefined {
    return this.assistants.find(a => a.id === id);
  }

  public removeAssistant(id: string): void {
    const index = this.assistants.findIndex(a => a.id === id);
    if (index !== -1) {
      this.assistants[index].destroy();
      this.assistants.splice(index, 1);
      this.saveAssistantsToStorage();
    }
  }

  public clearAll(): void {
    this.assistants.forEach(a => a.destroy());
    this.assistants = [];
    this.saveAssistantsToStorage();
  }

  public updateAssistant(assistant: Assistant): void {
    // Assistant is updated in place, save immediately (not debounced)
    this.saveAssistantsToStorageImmediate();
  }

  private saveAssistantsToStorageImmediate(): void {
    // Clear any pending debounced save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    try {
      const serializable: SerializableAssistant[] = this.assistants.map(assistant => {
        const messages = assistant.conversation.messages.map(msg => ({
          participant: {
            id: msg.chatParticipant.id,
            name: msg.chatParticipant.name,
            avatar: msg.chatParticipant.avatar,
            messageColor: msg.chatParticipant.messageColor
          },
          text: msg.text,
          timestamp: msg.timestamp.toISOString()
        }));

        return {
          id: assistant.id,
          name: assistant.name,
          avatar: assistant.avatar,
          wakeWord: assistant.wakeWord,
          modelId: assistant.modelId,
          voiceId: assistant.voiceId,
          messageColor: assistant.messageColor,
          messages
        };
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save assistants to localStorage:', error);
    }
  }

  private saveAssistantsToStorage(): void {
    // Clear any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce saves to avoid excessive localStorage writes
    this.saveTimeout = setTimeout(() => {
      try {
        const serializable: SerializableAssistant[] = this.assistants.map(assistant => {
          const messages = assistant.conversation.messages.map(msg => ({
            participant: {
              id: msg.chatParticipant.id,
              name: msg.chatParticipant.name,
              avatar: msg.chatParticipant.avatar,
              messageColor: msg.chatParticipant.messageColor
            },
            text: msg.text,
            timestamp: msg.timestamp.toISOString()
          }));

          return {
            id: assistant.id,
            name: assistant.name,
            avatar: assistant.avatar,
            wakeWord: assistant.wakeWord,
            modelId: assistant.modelId,
            voiceId: assistant.voiceId,
            messageColor: assistant.messageColor,
            messages
          };
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
      } catch (error) {
        console.error('Failed to save assistants to localStorage:', error);
      }
      this.saveTimeout = null;
    }, this.SAVE_DEBOUNCE_MS);
  }

  private loadAssistantsFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      const serializable: SerializableAssistant[] = JSON.parse(stored);

      // Clean up duplicate demo assistants (those with name "Assistant" and demo avatar)
      // Remove all demo assistants - they shouldn't be persisted
      const demoAssistants = serializable.filter(a =>
        a.name === 'Assistant' && a.avatar === 'assets/img/robo.webp'
      );
      const realAssistants = serializable.filter(a =>
        !(a.name === 'Assistant' && a.avatar === 'assets/img/robo.webp')
      );

      // If we removed any, use the cleaned list
      const assistantsToLoad = demoAssistants.length > 0 ? realAssistants : serializable;

      // If we removed any, save the cleaned list
      if (demoAssistants.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(realAssistants));
      }

      const user = this.userService.createUser();

      assistantsToLoad.forEach(data => {
        // Recreate messages
        const messages = data.messages.map(msgData => {
          // Determine if this is a user message or assistant message
          const participant: IChatParticipant = msgData.participant.id === data.id
            ? {
                id: data.id,
                name: data.name,
                avatar: data.avatar,
                messageColor: data.messageColor
              }
            : {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
                messageColor: user.messageColor
              };

          return new TextMessage(
            participant,
            msgData.text,
            new Date(msgData.timestamp)
          );
        });

        // Create assistant
        const assistant = new Assistant(
          data.id,
          data.name,
          data.avatar,
          data.wakeWord,
          this.audioService,
          this.llmService,
          user,
          this.vitsService,
          data.modelId
        );

        // Restore properties
        assistant.voiceId = data.voiceId;
        assistant.messageColor = data.messageColor;

        // Fix participant references in messages to point to actual assistant/user objects
        messages.forEach(msg => {
          if (msg.chatParticipant.id === assistant.id) {
            msg.chatParticipant = assistant;
          } else {
            msg.chatParticipant = user;
          }
        });

        // Restore conversation (constructor will automatically populate structured messages)
        assistant.conversation = new Conversation(messages);

        // Set up callback to save when conversation changes
        assistant.onConversationChanged = () => {
          this.saveAssistantsToStorage();
        };

        this.assistants.push(assistant);
      });
    } catch (error) {
      console.error('Failed to load assistants from localStorage:', error);
    }
  }
}
