import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { Conversation } from '../../models/conversation.model';
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

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  imports: [CommonModule, RouterOutlet, ChatComponent],
})
export class LandingComponent {
  @ViewChild(ChatComponent) chat!: ChatComponent;

  private startedListeningFlow = false;

  private readonly enableMicrophoneButtonMessage: ButtonMessage;
  private readonly startDownloadingModelButtonMessage: ButtonMessage;

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
    private cdr: ChangeDetectorRef
  ) {
    this.newUser = this.userService.createUser();
    this.newAssistant = this.AssistantService.createAssistant('Miku', 'assets/img/miku.svg', 'miku', this.newUser);


    this.enableMicrophoneButtonMessage = new ButtonMessage(
      this.newAssistant,
      'Enable Microphone',
      new Date(),
      'assets/img/microphone.svg',
      'button-1',
      this.audioService.requestMicrophoneAccess
    );

    this.startDownloadingModelButtonMessage = new ButtonMessage(
      this.newAssistant,
      'Download Model',
      new Date(),
      'assets/img/download.svg',
      'button-1',
      this.downloadModelFlow
    );

    this.initializeChatFlow();
  }

  private async initializeChatFlow() {
    // Handle whisper model
    const whisperModel = await this.indexedDBService.readModel(
      ModelKey.WhisperTinyEn
    );

    if (!whisperModel) {
      this.promptDownloadModelFlow();
    } else {
      await this.loadCachedModelFlow(whisperModel);
    }
  }

  private loadCachedModelFlow = async (model: Uint8Array) => {
    // Wait for whisper module to be loaded
    if (!this.whisperService.whisperModule) {
      console.warn('Waiting for whisper module to be loaded...');
      await this.whisperService.waitForModule();
    }

    await this.whisperService.loadModel(model);
    this.newAssistant.conversation.addMessage(
      new TextMessage(
        this.newAssistant,
        `Speech-to-Text AI model loaded from cache!`,
        new Date()
      )
    );

    // Handle microphone access
    await this.checkMicrophoneAccessFlow();
  };

  private downloadModelFlow = async () => {
    this.newAssistant.conversation.addMessage(
      new TextMessage(this.newAssistant, `Starting download...`, new Date())
    );
    const whisperModel = await this.httpHandlerService.fetchOctetStream(
      ModelUrl.WhisperTinyEn
    );

    this.indexedDBService.insertModel(ModelKey.WhisperTinyEn, whisperModel);

    // Wait for whisper module to be loaded
    if (!this.whisperService.whisperModule) {
      console.warn('Waiting for whisper module to be loaded...');
      await this.whisperService.waitForModule();
    }

    await this.whisperService.loadModel(whisperModel);
    this.newAssistant.conversation.addMessage(
      new TextMessage(
        this.newAssistant,
        `Done! I also cached it so you won't need to download it again later.`,
        new Date()
      )
    );

    await this.checkMicrophoneAccessFlow();
  };

  private checkMicrophoneAccessFlow = async () => {
    if (
      await this.audioService.isMicrophoneEnabled(
        this.microphoneStatusChangedCallback
      )
    ) {
      this.newAssistant.conversation.addMessage(
        new TextMessage(
          this.newAssistant,
          `Microphone access is already granted!`,
          new Date()
        )
      );

      await this.startListeningFlow();
    } else {
      await this.requestMicrophoneAccessFlow();
    }
  };

  private promptDownloadModelFlow() {
    this.newAssistant.conversation.addMessage(
      new TextMessage(
        this.newAssistant,
        `To get started, I need to download OpenAI's Speech-to-Text model.`,
        new Date()
      )
    );
    this.newAssistant.conversation.addMessage(this.startDownloadingModelButtonMessage);
  }

  private async requestMicrophoneAccessFlow() {
    this.newAssistant.conversation.addMessage(
      new TextMessage(
        this.newAssistant,
        `You'll need to provide access to your microphone.`,
        new Date()
      )
    );
    this.newAssistant.conversation.addMessage(this.enableMicrophoneButtonMessage);
  }

  private async startListeningFlow() {
    this.newAssistant.conversation.addMessage(
      new TextMessage(this.newAssistant, `Initializing AI...`, new Date())
    );

    // Initialize audio worklet processing
    await this.audioService.startListening();

    // Initialize Whisper processing
    await this.whisperService.initWhisper();

    this.newAssistant.conversation.addMessage(
      new TextMessage(
        this.newAssistant,
        `Started listening! Say "Miku" to start interacting.`,
        new Date()
      )
    );
    await Utilities.sleep(300);
    this.newAssistant.conversation.addMessage(
      new TextMessage(
        this.newAssistant,
        `For instance, you can say "Miku, what's the weather like?"`,
        new Date()
      )
    );
  }

  private microphoneStatusChangedCallback = async (
    permissionStatus: PermissionStatus
  ) => {
    if (permissionStatus.state === 'granted') {
      if (!this.startedListeningFlow && !this.audioService.listening) {
        this.startedListeningFlow = true;
        this.newAssistant.conversation.addMessage(
          new TextMessage(this.newAssistant, `Microphone access granted!`, new Date())
        );
        await this.startListeningFlow();
      }
    }
  };
}
