import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { AssistantService } from '../../services/assistant/assistant.service';
import { UserService } from '../../services/user/user.service';
import { AudioService } from '../../services/audio/audio.service';
import { WhisperService } from '../../services/whisper/whisper.service';
import { IndexedDBService } from '../../services/indexed-db/indexed-db.service';
import { HttpHandlerService } from '../../services/http-handler/http-handler.service';
import { LLMService } from '../../services/llm/llm.service';
import { VitsService } from '../../services/vits/vits.service';
import { ModelKey } from '../../enums/model-key.enum';
import { ModelUrl } from '../../enums/model-url.enum';
import { AudioProcessor } from '../../enums/audio-processor.enum';
import { Assistant } from '../../models/assistant.model';
import { User } from '../../models/user.model';
import { TextMessage } from '../../models/text-message.model';
import { ButtonMessage } from '../../models/button-message.model';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit {
  assistant: Assistant | null = null;
  currentUser: User;
  assistantId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assistantService: AssistantService,
    private userService: UserService,
    private audioService: AudioService,
    private whisperService: WhisperService,
    private indexedDBService: IndexedDBService,
    private httpHandlerService: HttpHandlerService,
    private llmService: LLMService,
    private vitsService: VitsService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = this.userService.createUser();
  }

  async ngOnInit(): Promise<void> {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('assistantId');
      if (id) {
        this.assistantId = id;
        await this.loadAssistant(id);
      }
    });
  }

  private async loadAssistant(id: string): Promise<void> {
    const assistant = this.assistantService.getAssistantById(id);
    if (assistant) {
      this.assistant = assistant;
      await this.initializeAudio();
    } else {
      // Assistant not found, redirect to landing page
      this.router.navigate(['/']);
    }
  }

  private async initializeAudio(): Promise<void> {
    if (!this.assistant) return;

    const cachedWhisperModel = await this.indexedDBService.readModel(
      ModelKey.WhisperTinyEn
    );

    // If Whisper is not cached, autostart the download flow (progress/completion messages only)
    if (!cachedWhisperModel) {
      void this.runDownloadModelsFlow();
      return;
    }

    // Check if microphone access is granted
    if (await this.audioService.isMicrophoneEnabled(() => {})) {
      // Load Whisper model if needed
      if (!this.whisperService.whisperInstance) {
        if (cachedWhisperModel) {
          if (!this.whisperService.whisperModule) {
            await this.whisperService.waitForModule();
          }
          await this.whisperService.loadModel(cachedWhisperModel);
          await this.whisperService.initWhisper();
        }
      }

      // Start listening if not already started
      if (!this.audioService.listening) {
        await this.audioService.startListening();
      }

      // Ensure the assistant is registered and processor is started
      if (!this.audioService.processingStates.get(AudioProcessor.Whisper)) {
        this.audioService.registerCallback(
          this.assistant.id,
          AudioProcessor.Whisper,
          (this.assistant as any).onTranscription.bind(this.assistant)
        );
      }
    }
  }

  /** Run from a specific step when retrying after a failure; undefined = full flow from start. */
  private runDownloadModelsFlow = async (
    startFrom?: 'whisper' | 'llm' | 'vits'
  ): Promise<void> => {
    if (!this.assistant) return;

    const assistant = this.assistant;
    const isFullFlow = startFrom === undefined;

    if (isFullFlow) {
      this.assistant.sendMessage(
        new TextMessage(this.assistant, `Starting downloads...`, new Date()),
        false
      );
    }

    // Whisper (skip if retrying from llm or vits)
    if (startFrom !== 'llm' && startFrom !== 'vits') {
      const cachedWhisperModel = await this.indexedDBService.readModel(
        ModelKey.WhisperTinyEn
      );
      if (cachedWhisperModel) {
        assistant.sendMessage(
          new TextMessage(
            assistant,
            `Accessing Speech-to-Text model from cache...`,
            new Date()
          ),
          false
        );
        if (!this.whisperService.whisperModule) {
          await this.whisperService.waitForModule();
        }
        await this.whisperService.loadModel(cachedWhisperModel);
        assistant.sendMessage(
          new TextMessage(
            assistant,
            `Speech-to-Text model loaded from cache!`,
            new Date()
          ),
          false
        );
      } else {
        const whisperProgressMsg = new TextMessage(
          assistant,
          `Downloading Speech-to-Text model...`,
          new Date(),
          0
        );
        assistant.sendMessage(whisperProgressMsg, false);
        const whisperModel = await this.httpHandlerService.fetchOctetStream(
          ModelUrl.WhisperTinyEn,
          (loaded, total) => {
            if (total !== undefined) {
              whisperProgressMsg.progress = Math.round((loaded / total) * 100);
              this.cdr.detectChanges();
            }
          }
        );
        whisperProgressMsg.progress = 100;
        this.cdr.detectChanges();
        this.indexedDBService.insertModel(ModelKey.WhisperTinyEn, whisperModel);
        if (!this.whisperService.whisperModule) {
          await this.whisperService.waitForModule();
        }
        await this.whisperService.loadModel(whisperModel);
        assistant.sendMessage(
          new TextMessage(
            assistant,
            `Speech-to-Text model downloaded and cached!`,
            new Date()
          ),
          false
        );
      }
    }

    // LLM (skip if retrying from vits only)
    if (startFrom !== 'vits') {
      const modelDisplayName = this.llmService.getModelDisplayName(assistant.modelId);
      if (await this.llmService.isModelCached(assistant.modelId)) {
      assistant.sendMessage(
        new TextMessage(
          assistant,
          `Accessing ${modelDisplayName} from cache...`,
          new Date()
        ),
        false
      );
      await this.llmService.init(assistant.modelId);
      assistant.sendMessage(
        new TextMessage(
          assistant,
          `${modelDisplayName} loaded from cache!`,
          new Date()
        ),
        false
      );
    } else {
      const llmProgressMsg = new TextMessage(
        assistant,
        `Downloading ${modelDisplayName}...`,
        new Date(),
        0
      );
      assistant.sendMessage(llmProgressMsg, false);
      try {
        await this.llmService.init(assistant.modelId, (report) => {
          llmProgressMsg.progress = Math.round(report.progress * 100);
          this.cdr.detectChanges();
        });
        llmProgressMsg.progress = 100;
        this.cdr.detectChanges();
      } catch (error) {
        assistant.sendMessage(
          new TextMessage(
            assistant,
            `There was a problem downloading the language model.`,
            new Date()
          ),
          false
        );
        const retryButton = new ButtonMessage(
          assistant,
          'Retry language model',
          new Date(),
          'assets/img/download.svg',
          'button-1',
          () => this.runDownloadModelsFlow('llm')
        );
        assistant.sendMessage(retryButton, false);
        return;
      }
      assistant.sendMessage(
        new TextMessage(
          assistant,
          `${modelDisplayName} downloaded and cached!`,
          new Date()
        ),
        false
      );
    }
    }

    // VITS (use assistant's voice)
    if (this.vitsService.isVoiceDownloaded(assistant.voiceId)) {
      assistant.sendMessage(
        new TextMessage(
          assistant,
          `Text-to-Speech model loaded from cache!`,
          new Date()
        ),
        false
      );
    } else {
      assistant.sendMessage(
        new TextMessage(
          assistant,
          `Downloading Text-to-Speech model...`,
          new Date()
        ),
        false
      );
      try {
        await this.vitsService.downloadVoice(assistant.voiceId);
      } catch (error) {
        assistant.sendMessage(
          new TextMessage(
            assistant,
            `There was a problem downloading the Text-to-Speech model.`,
            new Date()
          ),
          false
        );
        const retryButton = new ButtonMessage(
          assistant,
          'Retry Text-to-Speech',
          new Date(),
          'assets/img/download.svg',
          'button-1',
          () => this.runDownloadModelsFlow('vits')
        );
        assistant.sendMessage(retryButton, false);
        return;
      }
      assistant.sendMessage(
        new TextMessage(
          assistant,
          `Text-to-Speech model downloaded and cached!`,
          new Date()
        ),
        false
      );
    }

    // All models ready: start listening and register Whisper
    assistant.sendMessage(
      new TextMessage(assistant, `Initializing listener...`, new Date()),
      false
    );
    if (!this.audioService.listening) {
      await this.audioService.startListening();
    }
    await this.whisperService.initWhisper();
    if (!this.audioService.processingStates.get(AudioProcessor.Whisper)) {
      this.audioService.registerCallback(
        assistant.id,
        AudioProcessor.Whisper,
        (assistant as any).onTranscription.bind(assistant)
      );
    }
    assistant.sendMessage(
      new TextMessage(
        assistant,
        `Ready! You can talk to me using my wake word "${assistant.wakeWord}".`,
        new Date()
      ),
      false
    );
  };
}

