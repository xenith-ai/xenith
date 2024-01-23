import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TextMessage } from '../../models/text-message.model';
import { ButtonMessage } from '../../models/button-message.model';
import { IChatMessage } from '../../interfaces/chat-message.interface';

@Component({
    selector: 'app-chat-message',
    standalone: true,
    templateUrl: './chat-message.component.html',
    styleUrl: './chat-message.component.scss',
    imports: [CommonModule, RouterOutlet]
})
export class ChatMessageComponent implements OnInit {
  @Input() message?: IChatMessage;

  protected isTextMessage: boolean = false;
  protected isButtonMessage: boolean = false;

  protected buttonMessage?: ButtonMessage;
  protected textMessage?: TextMessage;

  ngOnInit() {
    if (this.message) {
      if (this.message instanceof TextMessage) {
        this.textMessage = this.message as TextMessage;
        this.isTextMessage = true;
      } else if (this.message instanceof ButtonMessage) {
        this.buttonMessage = this.message as ButtonMessage;
        this.isButtonMessage = true;
      }
    }
  }
}
