import {
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { InstanceOfPipe } from '../../pipes/instance-of.pipe';
import { Assistant } from '../../models/assistant.model';
import { User } from '../../models/user.model';
import { TextMessage } from '../../models/text-message.model';
import { ButtonMessage } from '../../models/button-message.model';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { AudioProcessor } from '../../enums/audio-processor.enum';
import { AudioService } from '../../services/audio/audio.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  imports: [CommonModule, RouterOutlet, InstanceOfPipe, ChatMessageComponent],
})
export class ChatComponent implements DoCheck {
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef;

  @Input() assistant!: Assistant;
  @Input() currentUser!: User;

  public User = User;
  public Assistant = Assistant;
  public TextMessage = TextMessage;
  public ButtonMessage = ButtonMessage;

  private lastDraftLength = 0;

  constructor(private cdr: ChangeDetectorRef, public audioService: AudioService) {}

  ngOnInit() {
    this.assistant.onMessageSent = () => {
      this.cdr.detectChanges();
      this.scrollToBottom();
    };
  }

  ngDoCheck(): void {
    const len = this.assistant.draftText?.length ?? 0;
    if (len !== this.lastDraftLength) {
      this.lastDraftLength = len;
      setTimeout(() => this.scrollInputToEnd(), 0);
    }
  }

  private scrollInputToEnd(): void {
    const el = this.chatInput?.nativeElement as HTMLInputElement | undefined;
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }

  protected inputOnEnter(element: HTMLInputElement) {
    this.assistant.sendMessage(element.value, true);
    this.cdr.detectChanges();

    element.value = '';
  }

  private scrollToBottom() {
    setTimeout(() => {
      this.chatMessages.nativeElement.scrollTop =
        this.chatMessages.nativeElement.scrollHeight;
    }, 50);
  }

  protected toggleListener(): void {
    const audioService = this.assistant['audioService']; // Not ideal, but okay for now

    if (!audioService.microphoneAccess) {
      audioService.requestMicrophoneAccess();
    } else if (!audioService.processingStates.get(AudioProcessor.Whisper)) {
      audioService.registerCallback(this.assistant.id, AudioProcessor.Whisper, this.assistant['onTranscription'].bind(this.assistant));
    } else {
      audioService.unregisterCallback(this.assistant.id);
    }
  }
}
