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
import { AudioService } from '../../services/audio/audio.service';
import { Transcription } from '../../models/transcription.model';
import { AudioProcessor } from '../../enums/audio-processor.enum';

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

  public readonly audioCallbackGuid: string = crypto.randomUUID();

  private silenceStarted?: Date;

  private triggered = false;

  private readonly silenceSendDelta = 3000;
  private readonly triggerWord = 'miku';

  private silenceTimer: any = null;

  constructor(
    private cdr: ChangeDetectorRef,
    protected audioService: AudioService
  ) { }

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
    if (!this.audioService.microphoneAccess) {
      this.audioService.requestMicrophoneAccess();
    } else if (!this.audioService.processingStates.get(AudioProcessor.Whisper)) {
      this.audioService.registerCallback(this.audioCallbackGuid, AudioProcessor.Whisper, this.transcriptionCallback);
    } else if (this.audioService.processingStates.get(AudioProcessor.Whisper)) {
      this.audioService.unregisterCallback(this.audioCallbackGuid);
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
      this.resetSilenceTimer();
    } else {
      this.handleSilence();
    }
  };

  private resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.silenceTimer = setTimeout(() => {
      this.handleSilence();
    }, this.silenceSendDelta);
  }

  private handleSilence() {
    if (this.triggered) {
      if (this.chatInput.nativeElement.value.length > 0) {
        this.sendMessage(this.chatInput.nativeElement.value);
      }
      this.triggered = false;
    }
  }
}
