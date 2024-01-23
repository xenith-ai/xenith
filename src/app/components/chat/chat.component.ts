import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Conversation } from '../../models/conversation.model';
import { InstanceOfPipe } from '../../pipes/instance-of.pipe';
import { AI } from '../../models/ai.model';
import { User } from '../../models/user.model';
import { TextMessage } from '../../models/text-message.model';
import { ButtonMessage } from '../../models/button-message.model';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { AudioRecorderService } from '../../services/audio-recorder/audio-recorder.service';

@Component({
    selector: 'app-chat',
    standalone: true,
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
    imports: [CommonModule, RouterOutlet, InstanceOfPipe, ChatMessageComponent]
})
export class ChatComponent {
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef;

  @Input() conversation?: Conversation;
  @Input() currentUser?: User;

  // Expose IChatParticipant types to template
  public AI = AI;
  public User = User;

  // Expose IChatMessage types to template
  public TextMessage = TextMessage;
  public ButtonMessage = ButtonMessage;

  currentInput: Array<string> = [];

  constructor(private cdr: ChangeDetectorRef, private audioRecorderService: AudioRecorderService) {
    this.audioRecorderService.speechCallback = this.speechCallback;
   }

  public sendMessage(value: string) {
    if (value && this.currentUser) {
      this.conversation?.addMessage(new TextMessage(this.currentUser, value, new Date()));
    }
  }

  protected inputOnEnter(element: HTMLInputElement) {
    this.sendMessage(element.value);
    element.value = '';

    // Apply visual changes first before updating scroll
    this.cdr.detectChanges();
    this.chatMessages.nativeElement.scrollTop = this.chatMessages.nativeElement.scrollHeight;
  }

  protected castType<TOriginal, TCast>(original: TOriginal): TCast {
    return original as unknown as TCast;
  }

  public speechCallback = (speech: string) => {
    if (!speech || !this.conversation) {
      return;
    }

    console.log(speech);
    if (!speech.includes('[BLANK_AUDIO]')) {
      this.chatInput.nativeElement.value += speech;
    } else if (this.currentInput.length > 0  && this.currentUser) {
      this.conversation.addMessage(new TextMessage(this.currentUser, this.chatInput.nativeElement.value, new Date()));
    }
  }
}
