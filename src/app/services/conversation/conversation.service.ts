import { Injectable } from '@angular/core';
import { Conversation } from '../../models/conversation.model';
import { Message } from '../../models/message.model';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  constructor() { }

  public createNewConversation(): Conversation {
    return new Conversation(new Array<Message>());
  }
}
