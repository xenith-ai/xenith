import { MessageGroup } from "./message-group.model";
import { Message } from "./message.model";

export class Conversation {
  structuredMessages: Array<MessageGroup> = [];

  constructor(
    public messages: Array<Message>,
  ) { }

  addMessage(message: Message) {
    this.messages.push(message);
  }
}
