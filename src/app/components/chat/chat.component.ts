import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Conversation } from '../../models/conversation.model';
import { InstanceOfPipe } from '../../pipes/instance-of.pipe';
import { AI } from '../../models/ai.model';
import { User } from '../../models/user.model';
import { Message } from '../../models/message.model';

@Component({
    selector: 'app-chat',
    standalone: true,
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
    imports: [CommonModule, RouterOutlet, InstanceOfPipe]
})
export class ChatComponent {
  @ViewChild('chatMessages') chatMessages!: ElementRef;

  @Input() conversation?: Conversation;
  @Input() currentUser?: User;

  // Give template access to types
  public AI = AI;
  public User = User;

  constructor(private cdr: ChangeDetectorRef) { }

  public sendMessage(value: string) {
    if (value && this.currentUser) {
      this.conversation?.addMessage(new Message(this.currentUser, value, new Date()));
    }
  }

  protected inputOnEnter(element: HTMLInputElement) {
    this.sendMessage(element.value);
    element.value = '';

    // Apply visual changes first before updating scroll
    this.cdr.detectChanges();
    this.chatMessages.nativeElement.scrollTop = this.chatMessages.nativeElement.scrollHeight;
  }
}
