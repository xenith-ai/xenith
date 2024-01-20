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
import { Message } from '../../models/message.model';

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

  constructor(private conversationService: ConversationService, private AIService: AIService, private userService: UserService) {
    this.conversation = this.conversationService.createNewConversation();

    this.newAI = this.AIService.createAI();
    this.newUser = this.userService.createUser();

    // Some test data for now
    this.conversation.addMessage(new Message(this.newAI, 'Hello, I am xenith. How can I help you? How can I help you? How can I help you?', new Date()));
    this.conversation.addMessage(new Message(this.newAI, 'This is a test message.', new Date()));
    this.conversation.addMessage(new Message(this.newUser, 'Another test message.', new Date()));
    this.conversation.addMessage(new Message(this.newUser, 'Test message again! We should make this a long message to test the visual component.', new Date()));
    this.conversation.addMessage(new Message(this.newUser, 'Test message a third time.', new Date()));
  }
}
