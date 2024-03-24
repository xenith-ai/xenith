import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from "../chat/chat.component";
import { Conversation } from '../../models/conversation.model';
import { ConversationService } from '../../services/conversation/conversation.service';
import { AIService } from '../../services/ai/ai.service';
import { UserService } from '../../services/user/user.service';
import { AI } from '../../models/ai.model';
import { User } from '../../models/user.model';
import { TextMessage } from '../../models/text-message.model';
import { ButtonMessage } from '../../models/button-message.model';
import { AudioRecorderService } from '../../services/audio-recorder/audio-recorder.service';
import { LocalStorageService } from '../../services/local-storage/local-storage.service';
import { IndexedDBService } from '../../services/indexed-db/indexed-db.service';
import { ModelKey } from '../../enums/model-key.enum';
import { HttpHandlerService } from '../../services/http-handler/http-handler.service';
import { ModelUrl } from '../../enums/model-url.enum';

@Component({
    selector: 'app-landing',
    standalone: true,
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss',
    imports: [CommonModule, RouterOutlet, ChatComponent]
})
export class LandingComponent {
  conversation: Conversation;
  newAI: AI;
  newUser: User;
  startedListeningFlow = false;

  enableMicrophoneButtonMessage: ButtonMessage;
  startDownloadingModelButtonMessage: ButtonMessage;

  constructor(private conversationService: ConversationService, private AIService: AIService, private userService: UserService, public audioRecorderService: AudioRecorderService, private localStorageService: LocalStorageService, private httpHandlerService: HttpHandlerService, private indexedDBService: IndexedDBService, private cdr: ChangeDetectorRef) {
    this.conversation = this.conversationService.createNewConversation();

    this.newAI = this.AIService.createAI();
    this.newUser = this.userService.createUser();

    this.enableMicrophoneButtonMessage = new ButtonMessage(this.newAI, 'Enable Microphone', new Date(), 'assets/img/microphone.svg', 'button-1', this.audioRecorderService.requestMicrophoneAccess);

    this.startDownloadingModelButtonMessage = new ButtonMessage(this.newAI, 'Download Model', new Date(), 'assets/img/download.svg', 'button-1', this.downloadModelFlow);

    this.initializeChatFlow();
  }

  async initializeChatFlow() {
    // Handle whisper model
    const whisperModel = await this.indexedDBService.readModel(ModelKey.WhisperTinyEn);

    if (!whisperModel) {
      this.promptDownloadModelFlow();
      return;
    }

    await this.loadModelFlow(whisperModel);
  }

  loadModelFlow = async (model: Uint8Array) => {
    await this.audioRecorderService.loadModel(model);
    this.conversation.addMessage(new TextMessage(this.newAI, `Speech-to-Text AI model loaded from cache!`, new Date()));

    // Handle microphone access
    await this.checkMicrophoneAccessFlow();
  }

  downloadModelFlow = async () => {
    this.conversation.addMessage(new TextMessage(this.newAI, `Starting download...` , new Date()));
    const whisperModel = await this.httpHandlerService.fetchOctetStream(ModelUrl.WhisperTinyEn);

    this.indexedDBService.insertModel(ModelKey.WhisperTinyEn, whisperModel);

    await this.audioRecorderService.loadModel(whisperModel);
    this.conversation.addMessage(new TextMessage(this.newAI, `Done! I also cached it so you won't need to download it again later.` , new Date()));

    await this.checkMicrophoneAccessFlow();
  }

  checkMicrophoneAccessFlow = async () => {
    if (await this.audioRecorderService.isMicrophoneEnabled(this.microphoneStatusChangedCallback)) {
      this.conversation.addMessage(new TextMessage(this.newAI, `Microphone access is already granted!`, new Date()));

      await this.startListeningFlow();
    } else {
      await this.requestMicrophoneAccessFlow();
    }
  }

  promptDownloadModelFlow() {
    this.conversation.addMessage(new TextMessage(this.newAI, `To get started, I need to download OpenAI's Speech-to-Text model.` , new Date()));
    this.conversation.addMessage(this.startDownloadingModelButtonMessage);
  }

  async requestMicrophoneAccessFlow() {
    const microphoneStatus = await this.audioRecorderService.isMicrophoneEnabled(this.microphoneStatusChangedCallback);

    this.conversation.addMessage(new TextMessage(this.newAI, `You'll need to provide access to your microphone.`, new Date()));
    this.conversation.addMessage(this.enableMicrophoneButtonMessage);
  }

  async startListeningFlow() {
    this.conversation.addMessage(new TextMessage(this.newAI, `Initializing listener...`, new Date()));

    await this.audioRecorderService.startListening(this.whisperInitializedCallback);
  }

  whisperInitializedCallback = () => {
    this.conversation.addMessage(new TextMessage(this.newAI, `Started listening! Say the activation `, new Date()));
    this.cdr.detectChanges(); // Ensure listener status is updated in the UI
  }

  microphoneStatusChangedCallback = async (permissionStatus: PermissionStatus) => {
    if (permissionStatus.state === 'granted') {
      if (!this.startedListeningFlow && !this.audioRecorderService.listening) {
        this.startedListeningFlow = true;
        this.conversation.addMessage(new TextMessage(this.newAI, `Microphone access granted!`, new Date()));
        await this.startListeningFlow();
      }
    }
  }
}
