import { IChatParticipant } from '../interfaces/chat-participant.interface';
import { IChatMessage } from '../interfaces/chat-message.interface';
import { Conversation } from './conversation.model';
import { TextMessage } from './text-message.model';
import { AudioService } from '../services/audio/audio.service';
import { LLMService } from '../services/llm/llm.service';
import { AudioProcessor } from '../enums/audio-processor.enum';
import { Transcription } from './transcription.model';
import { VitsService } from '../services/vits/vits.service';
import { v4 as uuidv4 } from 'uuid';
import { VoiceId } from '@diffusionstudio/vits-web';

export class Assistant implements IChatParticipant {
  wakeWord: string;
  public modelId: string;

  public isTyping = false;
  public conversation: Conversation;
  public draftText: string = '';
  public messageColor = 'linear-gradient(320deg, hsl(250, 60%, 40%) 0%, hsl(270, 70%, 35%) 100%)';
  public voiceId: VoiceId = 'en_US-hfc_female-medium';

  private readonly silenceSendDelta = 2000;
  private silenceTimer: any = null;
  public triggered = false;

  public onMessageSent: (() => void) | null = null;
  public onConversationChanged: (() => void) | null = null;
  public onTriggered: ((assistantId: string | null) => void) | null = null;

  constructor(
    public readonly id: string,
    public name: string,
    public avatar: string,
    wakeWord: string,
    private audioService: AudioService,
    private llmService: LLMService,
    private currentUser: IChatParticipant,
    private vitsService: VitsService,
    modelId: string = 'gemma-2-2b-it-q4f16_1-MLC'
  ) {
    this.id = id;
    this.name = name;
    this.avatar = avatar;
    this.wakeWord = wakeWord;
    this.modelId = modelId;
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
      // Update triggerWord if wakeWord changed
      const currentTriggerWord = this.wakeWord.toLowerCase();
      const triggerIndex = wordList.indexOf(currentTriggerWord);
      if (triggerIndex !== -1) {
        // Get everything AFTER trigger word
        const relevantString = wordList.slice(triggerIndex + 1).join(' ');
        this.appendToDraft(relevantString);
        this.triggered = true;
        // Notify that this assistant was triggered
        this.onTriggered?.(this.id);
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
      // Notify that this assistant is no longer triggered
      this.onTriggered?.(null as any);
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
    this.onConversationChanged?.();

    if (respondToUser) {
      this.respondToUser();
    }

    this.onMessageSent?.();
  }

  public async respondToUser(): Promise<void> {
    this.isTyping = true;

    // Notify that we're initializing the model
    if ((this as any).onModelInitializing) {
      (this as any).onModelInitializing(this.id, true);
    }

    try {
      const isCached = await this.llmService.isModelCached(this.modelId);
      let progressMsg: TextMessage | null = null;

      if (!isCached) {
        const modelName = this.llmService.getModelDisplayName(this.modelId);
        progressMsg = new TextMessage(
          this,
          `Downloading ${modelName}...`,
          new Date(),
          0
        );
        this.sendMessage(progressMsg, false);
      }

      await this.llmService.ensureModel(this.modelId, (report) => {
        if (progressMsg !== null) {
          progressMsg.progress = Math.round(report.progress * 100);
          this.onMessageSent?.();
        }
      });

      if (progressMsg !== null) {
        progressMsg.progress = 100;
        this.onMessageSent?.();
      }
    } finally {
      // Notify that initialization is complete
      if ((this as any).onModelInitializing) {
        (this as any).onModelInitializing(this.id, false);
      }
    }

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
      this.vitsService.streamToken(token, responseGuid, this.voiceId);
      assistantMessage.text += token;
      this.onMessageSent?.();
    });

    this.vitsService.complete(responseGuid, this.voiceId, () => {});

    this.isTyping = false;
  }

  /** Unregister from audio processing (e.g. when globally pausing listening). */
  public unregisterFromAudio(): void {
    this.audioService.unregisterCallback(this.id);
  }

  /** Re-register for audio processing after globally resuming listening. */
  public reregisterWithAudio(): void {
    this.audioService.registerCallback(
      this.id,
      AudioProcessor.Whisper,
      this.onTranscription.bind(this)
    );
  }

  public destroy(): void {
    this.audioService.unregisterCallback(this.id);
    clearTimeout(this.silenceTimer);
  }
}
