import {
  ChangeDetectorRef,
  Component,
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

  @Input() assistant!: Assistant;
  @Input() currentUser!: User;

  public User = User;
  public Assistant = Assistant;
  public TextMessage = TextMessage;
  public ButtonMessage = ButtonMessage;

  constructor(private cdr: ChangeDetectorRef) {

  }

  ngOnInit() {
    this.assistant.onMessageSent = () => this.scrollToBottom();
  }

  public sendMessage(value: string) {
    if (value?.trim()) {
      this.assistant.sendMessage(value);
      this.assistant.draftText = ''; // clear out the input

      this.cdr.detectChanges(); // ✅ force re-render

      setTimeout(() => {
        this.scrollToBottom(); // ✅ now it actually scrolls after DOM updates
      }, 0);
    }
  }

  protected inputOnEnter(element: HTMLInputElement) {
    this.sendMessage(element.value);
    this.cdr.detectChanges();
  }

  public onDraftInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.assistant.draftText = input.value;
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
