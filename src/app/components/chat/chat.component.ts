import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
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
import { Transcription } from '../../models/transcription.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  imports: [CommonModule, RouterOutlet, InstanceOfPipe, ChatMessageComponent],
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

  private silenceStarted?: Date;

  private triggered = false;

  private readonly silenceSendDelta = 3000;
  private readonly triggerWord = 'miku';

  constructor(
    private cdr: ChangeDetectorRef,
    protected audioRecorderService: AudioRecorderService
  ) {
    this.audioRecorderService.transcriptionCallback =
      this.transcriptionCallback;
  }

  public sendMessage(value: string) {
    if (value && this.currentUser) {
      this.conversation?.addMessage(
        new TextMessage(this.currentUser, value, new Date())
      );
      this.chatInput.nativeElement.value = '';

      this.cdr.detectChanges();
      this.chatMessages.nativeElement.scrollTop =
        this.chatMessages.nativeElement.scrollHeight;
    }
  }

  protected toggleListener() {
    if (!this.audioRecorderService.microphoneAccess) {
      this.audioRecorderService.requestMicrophoneAccess();
    } else if (!this.audioRecorderService.listening) {
      this.audioRecorderService.startListening(() => {});
    } else if (this.audioRecorderService.listening) {
      this.audioRecorderService.stopListening();
    }
  }

  protected inputOnEnter(element: HTMLInputElement) {
    this.sendMessage(element.value);

    // Apply visual changes first before updating scroll
    this.cdr.detectChanges();
    console.log(this.chatMessages.nativeElement.scrollTop);
  }

  protected castType<TOriginal, TCast>(original: TOriginal): TCast {
    return original as unknown as TCast;
  }

  public transcriptionCallback = (transcription: Transcription) => {
    if (!this.conversation) {
      console.log(
        'Transcription callback triggered but there is no conversation to send message to'
      );
      return;
    }

    if (transcription?.indexableTranscription) {
      if (this.triggered) {
        this.chatInput.nativeElement.value +=
          ' ' + transcription.originalTranscription;
      } else {
        const triggerIndex = transcription.wordList.indexOf(this.triggerWord);
        if (triggerIndex != -1) {
          const relevantString = transcription.wordList
            .slice(triggerIndex + 1)
            .join(' ');
          this.chatInput.nativeElement.value += ' ' + relevantString;
          this.triggered = true;
        }
      }
    } else {
      if (this.triggered) {
        if (!this.silenceStarted) {
          this.silenceStarted = new Date();
        } else if (
          new Date().getTime() - this.silenceStarted.getTime() >
          this.silenceSendDelta
        ) {
          // if transcription is empty, reset trigger and send message if there is any content
          if (this.chatInput.nativeElement.value.length > 0) {
            this.sendMessage(this.chatInput.nativeElement.value);
          }

          this.triggered = false;
          this.silenceStarted = undefined;
        }
      }
    }
  };
}
