import { Component } from '@angular/core';
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
import { LocalStorageKey } from '../../enums/local-storage-key.enum';

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

  enableMicrophoneButtonMessage: ButtonMessage;
  startDownloadingModelButtonMessage: ButtonMessage;

  constructor(private conversationService: ConversationService, private AIService: AIService, private userService: UserService, private audioRecorderService: AudioRecorderService, private localStorageService: LocalStorageService) {
    this.conversation = this.conversationService.createNewConversation();

    this.newAI = this.AIService.createAI();
    this.newUser = this.userService.createUser();

    this.enableMicrophoneButtonMessage = new ButtonMessage(this.newAI, 'Enable Microphone', new Date(), 'assets/img/microphone.svg', 'button-1', this.audioRecorderService.startListening);

    this.startDownloadingModelButtonMessage = new ButtonMessage(this.newAI, 'Download Model', new Date(), 'assets/img/download.svg', 'button-1', this.downloadModelFlow);

    this.initializeChatFlow();
  }

  async initializeChatFlow() {
    // Handle whisper model
    const whisperModel = this.localStorageService.getWhisperModel(LocalStorageKey.WhisperTinyEn);

    if (!whisperModel) {
      this.promptDownloadModelFlow();
      return;
    }

    this.audioRecorderService.loadModel(whisperModel);
    this.conversation.addMessage(new TextMessage(this.newAI, `Speech-to-Text AI model loaded from cache!`, new Date()));

    // Handle microphone access
    this.checkMicrophoneAccessFlow();
  }

  downloadModelFlow = async () => {
    this.conversation.addMessage(new TextMessage(this.newAI, `Starting download...` , new Date()));
    await this.audioRecorderService.loadModel();
    this.conversation.addMessage(new TextMessage(this.newAI, `Done! I also cached it so you won't need to download it again later.` , new Date()));

    await this.checkMicrophoneAccessFlow();
  }

  checkMicrophoneAccessFlow = async () => {
    if (await this.audioRecorderService.isMicrophoneEnabled(this.microphoneStatusChangedCallback)) {
      this.conversation.addMessage(new TextMessage(this.newAI, `Microphone access is already granted!`, new Date()));

      this.startListeningFlow();
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

    this.startListeningFlow();
  }

  async startListeningFlow() {
    this.conversation.addMessage(new TextMessage(this.newAI, `Initializing listener...`, new Date()));
    await this.audioRecorderService.startListening();
    this.conversation.addMessage(new TextMessage(this.newAI, `Started listening! Say the activation `, new Date()));
  }

  microphoneStatusChangedCallback = (permissionStatus: PermissionStatus) => {
    if (permissionStatus.state === 'granted') {
      this.conversation.addMessage(new TextMessage(this.newAI, `Microphone access granted!`, new Date()));
      this.startListeningFlow();
    }
  }
}
