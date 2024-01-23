import { Component, OnInit } from '@angular/core';
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

  constructor(private conversationService: ConversationService, private AIService: AIService, private userService: UserService, private audioRecorderService: AudioRecorderService) {
    this.conversation = this.conversationService.createNewConversation();

    this.newAI = this.AIService.createAI();
    this.newUser = this.userService.createUser();

    this.enableMicrophoneButtonMessage = new ButtonMessage(this.newAI, 'Enable Microphone', new Date(), 'assets/img/microphone.svg', 'button-1', this.audioRecorderService.startRecording);

    // Some test data for now
    this.conversation.addMessage(new TextMessage(this.newAI, 'Hello, welcome to Xenith!', new Date()));
    this.conversation.addMessage(new TextMessage(this.newAI, `Once you've enabled your microphone, you can start talking.`, new Date()));
    this.conversation.addMessage(this.enableMicrophoneButtonMessage);
  }
}
