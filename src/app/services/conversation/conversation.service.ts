import { Injectable } from '@angular/core';
import { Conversation } from '../../models/conversation.model';
import { IChatMessage } from '../../interfaces/chat-message.interface';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  constructor() {}

  public createNewConversation(): Conversation {
    return new Conversation(new Array<IChatMessage>());
  }
}
