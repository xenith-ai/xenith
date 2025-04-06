import { IChatParticipant } from '../interfaces/chat-participant.interface';
import { IChatMessage } from '../interfaces/chat-message.interface';
import { Conversation } from './conversation.model';
import { AudioService } from '../services/audio/audio.service';
import { LLMService } from '../services/llm/llm.service';
import { AudioProcessor } from '../enums/audio-processor.enum';
import { Transcription } from './transcription.model';
import { VitsService } from '../services/vits/vits.service';
import { v4 as uuidv4 } from 'uuid';

export class Assistant implements IChatParticipant {
  wakeWord: string;

  public isTyping = false;
  public conversation: Conversation;
  public draftText: string = '';
  public messageColor = 'linear-gradient(320deg, hsl(250, 60%, 40%) 0%, hsl(270, 70%, 35%) 100%)';
  public voiceId = 'en_US-hfc_female-medium';

  private readonly triggerWord: string;
  private readonly silenceSendDelta = 3000;
  private silenceTimer: any = null;
  public triggered = false;

  public onMessageSent: (() => void) | null = null;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly avatar: string,
    wakeWord: string,
    private audioService: AudioService,
    private llmService: LLMService,
    private currentUser: IChatParticipant,
    private vitsService: VitsService
  ) {
    this.id = id;
    this.wakeWord = wakeWord;
    this.triggerWord = wakeWord; // Just using wakeWord for now
    this.conversation = new Conversation([]);

    this.audioService.registerCallback(
      this.id,
      AudioProcessor.Whisper,
      this.onTranscription.bind(this)
    );
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
    this.silenceTimer = setTimeout(
      () => this.handleSilence(),
      this.silenceSendDelta
    );
  }

  private handleSilence(): void {
    if (this.triggered && this.draftText.length > 0) {
      this.sendMessage(this.draftText, true);
      this.draftText = '';
      this.triggered = false;
    }
  }

  public sendMessage(message: IChatMessage, respondToUser: boolean): void;
  public sendMessage(text: string, respondToUser: boolean): void;
  public sendMessage(
    param: IChatMessage | string,
    respondToUser: boolean
  ): void {
    let message: IChatMessage;

    if (typeof param === 'string') {
      message = {
        chatParticipant: this.currentUser,
        text: param,
        timestamp: new Date(),
      };
    } else {
      message = param;
    }

    this.conversation.addMessage(message);

    if (respondToUser) {
      this.respondToUser();
    }

    this.onMessageSent?.();
  }

  public async respondToUser(): Promise<void> {
    this.isTyping = true;

    const lastMsg = this.conversation.messages.at(-1);
    const formattedMessages = lastMsg
      ? [
          {
            role: 'system' as const,
            content: 'You are a virtual assistant. Your responses should be short (2-3 sentences) and be able to be read aloud verbatim.',
          },
          {
            role:
              lastMsg.chatParticipant === this
                ? ('assistant' as const)
                : ('user' as const),
            content: lastMsg.text,
          },
        ]
      : [];

    const assistantMessage: IChatMessage = {
      chatParticipant: this,
      text: '',
      timestamp: new Date(),
    };

    this.sendMessage(assistantMessage, false);

    const responseGuid = uuidv4();

    await this.llmService.streamResponse(formattedMessages, (token, usage) => {
      this.vitsService.streamToken(token, responseGuid);
      assistantMessage.text += token;
      this.onMessageSent?.();
    });

    this.vitsService.complete(responseGuid, this.voiceId, () => {});

    this.isTyping = false;
  }

  public destroy(): void {
    this.audioService.unregisterCallback(this.id);
    clearTimeout(this.silenceTimer);
  }
}
