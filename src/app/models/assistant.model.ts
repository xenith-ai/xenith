import { IChatParticipant } from '../interfaces/chat-participant.interface';
import { IChatMessage } from '../interfaces/chat-message.interface';
import { Conversation } from './conversation.model';
import { AudioService } from '../services/audio/audio.service';
import { LLMService } from '../services/llm/llm.service';
import { AudioProcessor } from '../enums/audio-processor.enum';
import { Transcription } from './transcription.model';

export class Assistant implements IChatParticipant {
  wakeWord: string;

  // Existing fields
  public isListening = false;
  public isActivated = false;
  public isTyping = false;
  public conversation: Conversation;
  public draftText: string = '';

  // Voice-related config
  private readonly triggerWord: string;
  private readonly silenceSendDelta = 3000;
  private silenceTimer: any = null;
  private triggered = false;

  public onMessageSent: (() => void) | null = null;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly avatar: string,
    wakeWord: string,
    private audioService: AudioService,
    private llmService: LLMService,
    private currentUser: IChatParticipant
  ) {
    this.id = id;
    this.wakeWord = wakeWord;
    this.triggerWord = wakeWord; // Just using wakeWord for now
    this.conversation = new Conversation([]);

    this.audioService.registerCallback(this.id, AudioProcessor.Whisper, this.onTranscription.bind(this));
  }

  private onTranscription(transcription: Transcription): void {
    if (!transcription?.indexableTranscription) {
      this.handleSilence();
      return;
    }

    const wordList = transcription.wordList;

    if (this.triggered) {
      // Append full transcription once triggered
      this.appendToDraft(transcription.originalTranscription);
    } else {
      const triggerIndex = wordList.indexOf(this.triggerWord);
      if (triggerIndex !== -1) {
        // Get everything AFTER trigger word
        const relevantString = wordList.slice(triggerIndex + 1).join(' ');
        this.appendToDraft(relevantString);
        this.triggered = true;
      }
    }

    this.resetSilenceTimer();
  }

  private appendToDraft(text: string): void {
    this.draftText = (this.draftText + ' ' + text).trim();
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.silenceTimer = setTimeout(() => this.handleSilence(), this.silenceSendDelta);
  }

  private handleSilence(): void {
    if (this.triggered && this.draftText.length > 0) {
      this.sendMessage(this.draftText);
      this.draftText = '';
      this.triggered = false;
    }
  }

  public sendMessage(message: IChatMessage): void;
  public sendMessage(text: string): void;
  public sendMessage(param: IChatMessage | string): void {
    let message: IChatMessage;

    if (typeof param === "string") {
      message = {
        chatParticipant: this.currentUser,
        text: param,
        timestamp: new Date(),
      };
    } else {
      message = param;
    }

    this.conversation.addMessage(message);
    this.respondToUser();

    this.onMessageSent?.();
  }

  public async respondToUser(): Promise<void> {
    this.isTyping = true;

    const formattedMessages = this.conversation.messages.map((msg) => ({
      role: msg.chatParticipant === this ? 'assistant' as const : 'user' as const,
      content: msg.text,
    }));

    const responseText = await this.llmService.generateResponse(formattedMessages);
    const assistantMessage: IChatMessage = {
      chatParticipant: this,
      text: responseText,
      timestamp: new Date(),
    };

    this.sendMessage(assistantMessage);
    this.isTyping = false;
  }

  public destroy(): void {
    this.audioService.unregisterCallback(this.id);
    clearTimeout(this.silenceTimer);
  }
}
