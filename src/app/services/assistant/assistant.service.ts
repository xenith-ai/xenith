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
const LAST_ASSISTANT_KEY = 'xenith_last_assistant_id';

@Injectable({
  providedIn: 'root',
})
export class AssistantService {
  private assistants: Assistant[] = [];
  private userService: UserService;
  private saveTimeout: any = null;
  private readonly SAVE_DEBOUNCE_MS = 1000; // Save 1 second after last change
  private triggeredAssistantId: string | null = null;
  private initializingModels: Set<string> = new Set(); // Track which assistants are initializing models

  constructor(
    private audioService: AudioService,
    private llmService: LLMService,
    private vitsService: VitsService,
    userService: UserService
  ) {
    this.userService = userService;
    // Load assistants asynchronously to avoid blocking UI
    setTimeout(() => {
      this.loadAssistantsFromStorage();
    }, 0);

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
    modelId: string = 'gemma-2-2b-it-q4f16_1-MLC',
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

    // Set up callbacks (only if persisting)
    if (persist) {
      assistant.onConversationChanged = () => {
        this.saveAssistantsToStorage();
      };
      assistant.onTriggered = (assistantId: string | null) => {
        this.setTriggeredAssistant(assistantId);
      };
      // Track model initialization
      (assistant as any).onModelInitializing = (assistantId: string, initializing: boolean) => {
        this.setInitializingModel(assistantId, initializing);
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

  getLastSelectedAssistantId(): string | null {
    try {
      return localStorage.getItem(LAST_ASSISTANT_KEY);
    } catch {
      return null;
    }
  }

  setLastSelectedAssistantId(id: string | null): void {
    try {
      if (id == null) {
        localStorage.removeItem(LAST_ASSISTANT_KEY);
      } else {
        localStorage.setItem(LAST_ASSISTANT_KEY, id);
      }
    } catch {
      // ignore
    }
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

  public setTriggeredAssistant(assistantId: string | null): void {
    this.triggeredAssistantId = assistantId;
  }

  public getTriggeredAssistantId(): string | null {
    return this.triggeredAssistantId;
  }

  public isAnyAssistantTriggered(): boolean {
    return this.triggeredAssistantId !== null;
  }

  public isInitializingModel(assistantId: string): boolean {
    return this.initializingModels.has(assistantId);
  }

  public setInitializingModel(assistantId: string, initializing: boolean): void {
    if (initializing) {
      this.initializingModels.add(assistantId);
    } else {
      this.initializingModels.delete(assistantId);
    }
  }

  /** Stop microphone, unregister all assistants from audio (STT), and unload WebLLM. */
  public stopListeningAndDeactivate(): void {
    this.assistants.forEach(a => a.unregisterFromAudio());
    this.audioService.stopListening();
    this.llmService.unload().catch((err) => console.error('[AssistantService] WebLLM unload failed', err));
  }

  /** Start microphone and re-register all assistants for audio (STT). */
  public async startListeningAndActivate(): Promise<void> {
    await this.audioService.startListening();
    this.assistants.forEach(a => a.reregisterWithAudio());
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

      // Load assistants in batches to avoid blocking UI
      this.loadAssistantsBatch(assistantsToLoad, user, 0);
    } catch (error) {
      console.error('Failed to load assistants from localStorage:', error);
    }
  }

  private loadAssistantsBatch(
    dataArray: SerializableAssistant[],
    user: User,
    index: number
  ): void {
    if (index >= dataArray.length) {
      return;
    }

    // Process one assistant at a time, yielding to UI thread
    const data = dataArray[index];
    this.loadSingleAssistant(data, user);

    // Schedule next assistant to load after a small delay
    setTimeout(() => {
      this.loadAssistantsBatch(dataArray, user, index + 1);
    }, 0);
  }

  private loadSingleAssistant(data: SerializableAssistant, user: User): void {
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

        // Set up callbacks
        assistant.onConversationChanged = () => {
          this.saveAssistantsToStorage();
        };
        assistant.onTriggered = (assistantId: string | null) => {
          this.setTriggeredAssistant(assistantId);
        };
        // Track model initialization
        (assistant as any).onModelInitializing = (assistantId: string, initializing: boolean) => {
          this.setInitializingModel(assistantId, initializing);
        };

        this.assistants.push(assistant);
  }
}
