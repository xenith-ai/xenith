import {
  ChangeDetectorRef,
  Component,
  ViewChild,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { ConversationService } from '../../services/conversation/conversation.service';
import { AssistantService } from '../../services/assistant/assistant.service';
import { UserService } from '../../services/user/user.service';
import { Assistant } from '../../models/assistant.model';
import { User } from '../../models/user.model';
import { TextMessage } from '../../models/text-message.model';
import { ButtonMessage } from '../../models/button-message.model';
import { AudioService } from '../../services/audio/audio.service';
import { LocalStorageService } from '../../services/local-storage/local-storage.service';
import { IndexedDBService } from '../../services/indexed-db/indexed-db.service';
import { ModelKey } from '../../enums/model-key.enum';
import { HttpHandlerService } from '../../services/http-handler/http-handler.service';
import { ModelUrl } from '../../enums/model-url.enum';
import { Utilities } from '../../helpers/utilities';
import { WhisperService } from '../../services/whisper/whisper.service';
import { LLMService } from '../../services/llm/llm.service';
import { VitsService } from '../../services/vits/vits.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  imports: [CommonModule, RouterOutlet, ChatComponent],
})
export class LandingComponent implements OnDestroy {
  @ViewChild(ChatComponent) chat!: ChatComponent;

  private startedListeningFlow = false;

  private readonly enableMicrophoneButtonMessage: ButtonMessage;
  private readonly startDownloadingModelsButtonMessage: ButtonMessage;

  protected newAssistant: Assistant;
  protected newUser: User;

  constructor(
    private conversationService: ConversationService,
    private AssistantService: AssistantService,
    private userService: UserService,
    public audioService: AudioService,
    public whisperService: WhisperService,
    private localStorageService: LocalStorageService,
    private httpHandlerService: HttpHandlerService,
    private indexedDBService: IndexedDBService,
    private cdr: ChangeDetectorRef,
    private LLMService: LLMService,
    private vitsService: VitsService
  ) {
    this.newUser = this.userService.createUser();
    // Create demo assistant without persisting it (persist: false)
    this.newAssistant = this.AssistantService.createAssistant(
      'Assistant',
      'assets/img/robo.webp',
      'assistant',
      this.newUser,
      'Qwen2.5-3B-Instruct-q4f16_1-MLC',
      false // Don't persist the demo assistant
    );

    this.enableMicrophoneButtonMessage = new ButtonMessage(
      this.newAssistant,
      'Enable Microphone',
      new Date(),
      'assets/img/microphone.svg',
      'button-1',
      this.audioService.requestMicrophoneAccess
    );

    this.startDownloadingModelsButtonMessage = new ButtonMessage(
      this.newAssistant,
      'Download AI Models',
      new Date(),
      'assets/img/download.svg',
      'button-1',
      this.downloadModelsFlow
    );

    this.initializeChatFlow();
  }

  private async initializeChatFlow() {
    this.newAssistant.sendMessage(
      new TextMessage(
        this.newAssistant,
        `Welcome to Xenith, the first fully local AI assistant powered by Web Assembly! 100% in-browser, nothing leaves your device.`,
        new Date()
      ),
      false
    );

    await Utilities.sleep(500);

    this.newAssistant.sendMessage(
      new TextMessage(
        this.newAssistant,
        `Everything here is running completely on your machine, so you'll probably need a dedicated GPU.`,
        new Date()
      ),
      false
    );

    const cachedWhisperModel = await this.indexedDBService.readModel(
      ModelKey.WhisperTinyEn
    );
    const isLLMModelCached = await this.LLMService.isModelCached();
    await this.vitsService.loadVoices();
    const isVitsModelCached = this.vitsService.isVoiceDownloaded(this.newAssistant.voiceId);

    await Utilities.sleep(500);

    if (cachedWhisperModel && isLLMModelCached && isVitsModelCached) {
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `All required AI models are already cached. Initializing models...`,
          new Date()
        ),
        false
      );

      // Load Whisper model from cache
      if (!this.whisperService.whisperModule) {
        console.warn('Waiting for whisper module to be loaded...');
        await this.whisperService.waitForModule();
      }
      await this.whisperService.loadModel(cachedWhisperModel);

      // Initialize LLM
      await this.LLMService.init();

      // Proceed to microphone access flow
      await this.checkMicrophoneAccessFlow();
    } else {
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `I need to download some AI models to get started.`,
          new Date()
        ),
        false
      );
      this.newAssistant.sendMessage(this.startDownloadingModelsButtonMessage, false);
    }
  }

  private downloadModelsFlow = async () => {
    this.newAssistant.sendMessage(
      new TextMessage(this.newAssistant, `Starting downloads...`, new Date()),
      false
    );

    // Handle Whisper model
    const cachedWhisperModel = await this.indexedDBService.readModel(
      ModelKey.WhisperTinyEn
    );
    if (cachedWhisperModel) {
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `Accessing Speech-to-Text model from cache...`,
          new Date()
        ),
        false
      );
      if (!this.whisperService.whisperModule) {
        console.warn('Waiting for whisper module to be loaded...');
        await this.whisperService.waitForModule();
      }
      await this.whisperService.loadModel(cachedWhisperModel);
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `Speech-to-Text model loaded from cache!`,
          new Date()
        ),
        false
      );
    } else {
      const whisperProgressMsg = new TextMessage(
        this.newAssistant,
        `Downloading Speech-to-Text model...`,
        new Date(),
        0
      );
      this.newAssistant.sendMessage(whisperProgressMsg, false);
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
        console.warn('Waiting for whisper module to be loaded...');
        await this.whisperService.waitForModule();
      }
      await this.whisperService.loadModel(whisperModel);
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `Speech-to-Text model downloaded and cached!`,
          new Date()
        ),
        false
      );
    }

    // Handle LLM model (use demo assistant's model)
    const llmModelId = this.newAssistant.modelId;
    const llmDisplayName = this.LLMService.getModelDisplayName(llmModelId);
    if (await this.LLMService.isModelCached(llmModelId)) {
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `Accessing ${llmDisplayName} from cache...`,
          new Date()
        ),
        false
      );
      await this.LLMService.init(llmModelId);
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `${llmDisplayName} loaded from cache!`,
          new Date()
        ),
        false
      );
    } else {
      const llmProgressMsg = new TextMessage(
        this.newAssistant,
        `Downloading ${llmDisplayName}...`,
        new Date(),
        0
      );
      this.newAssistant.sendMessage(llmProgressMsg, false);
      try {
        await this.LLMService.init(
          llmModelId,
          (report) => {
            llmProgressMsg.progress = Math.round(report.progress * 100);
            this.cdr.detectChanges();
          }
        );
        llmProgressMsg.progress = 100;
        this.cdr.detectChanges();
      } catch (error) {
        this.newAssistant.sendMessage(
          new TextMessage(
            this.newAssistant,
            `There was a problem downloading the language model.`,
            new Date()
          ),
          false
        );
        this.newAssistant.sendMessage(this.startDownloadingModelsButtonMessage, false);
        return;
      }
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `${llmDisplayName} downloaded and cached!`,
          new Date()
        ),
        false
      );
    }

    // Handle VITS model
    if (this.vitsService.isVoiceDownloaded(this.newAssistant.voiceId)) {
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `Text-to-Speech model loaded from cache!`,
          new Date()
        ),
        false
      );
    } else {
      this.newAssistant.sendMessage(
        new TextMessage(this.newAssistant, `Downloading VITS Text-to-Speech model...`, new Date()),
        false
      );
      try {
        await this.vitsService.downloadVoice(this.newAssistant.voiceId);
      } catch (error) {
        this.newAssistant.sendMessage(
          new TextMessage(
            this.newAssistant,
            `There was a problem downloading the VITS Text-to-Speech model.`,
            new Date()
          ),
          false
        );
        this.newAssistant.sendMessage(this.startDownloadingModelsButtonMessage, false);
        return;
      }
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `VITS Text-to-Speech model downloaded and cached!`,
          new Date()
        ),
        false
      );
    }

    // Proceed to microphone access flow
    await this.checkMicrophoneAccessFlow();
  };

  private async checkMicrophoneAccessFlow() {
    if (
      await this.audioService.isMicrophoneEnabled(
        this.microphoneStatusChangedCallback
      )
    ) {
      this.newAssistant.sendMessage(
        new TextMessage(
          this.newAssistant,
          `Microphone access is already granted!`,
          new Date()
        ),
        false
      );

      await this.startListeningFlow();
    } else {
      await this.requestMicrophoneAccessFlow();
    }
  }

  private async requestMicrophoneAccessFlow() {
    this.newAssistant.sendMessage(
      new TextMessage(
        this.newAssistant,
        `You'll need to provide access to your microphone if you want to interact with your voice.`,
        new Date()
      ),
      false
    );
    this.newAssistant.sendMessage(this.enableMicrophoneButtonMessage, false);
  }

  private async startListeningFlow() {
    this.newAssistant.sendMessage(
      new TextMessage(this.newAssistant, `Initializing listener...`, new Date()),
      false
    );

    // Initialize audio worklet processing
    await this.audioService.startListening();

    // Initialize Whisper processing
    await this.whisperService.initWhisper();

    this.newAssistant.sendMessage(
      new TextMessage(
        this.newAssistant,
        `Started listening! Say "Assistant" to start interacting.`,
        new Date()
      ),
      false
    );
    this.newAssistant.sendMessage(
      new TextMessage(
        this.newAssistant,
        `For instance, you can say "Assistant, who invented the microchip?"`,
        new Date()
      ),
      false
    );
  }

  private microphoneStatusChangedCallback = async (
    permissionStatus: PermissionStatus
  ) => {
    if (permissionStatus.state === 'granted') {
      if (!this.startedListeningFlow && !this.audioService.listening) {
        this.startedListeningFlow = true;
        this.newAssistant.sendMessage(
          new TextMessage(
            this.newAssistant,
            `Microphone access granted!`,
            new Date()
          ),
          false
        );
        await this.startListeningFlow();
      }
    }
  };

  ngOnDestroy(): void {
    this.audioService.unregisterCallback(this.newAssistant.id);
  }

  @HostListener('document:click', ['$event'])
  onPageClick(event: MouseEvent): void {
    // Only close sidebar on desktop when clicking on landing page content
    // (not on mobile, and not when clicking inside sidebar or nav)
    if (window.innerWidth > 624) { // 39em = 624px
      const target = event.target as HTMLElement;

      // Don't close if clicking inside sidebar, nav, or dialog
      if (target.closest('.sidebar-container') ||
          target.closest('app-nav-top') ||
          target.closest('app-add-assistant-dialog')) {
        return;
      }

      // Check if sidebar is open
      const sidebarElement = document.querySelector('.sidebar-container.open');
      if (sidebarElement) {
        // Close the sidebar by dispatching a custom event
        // The app component will listen for this
        window.dispatchEvent(new CustomEvent('close-sidebar'));
      }
    }
  }
}
