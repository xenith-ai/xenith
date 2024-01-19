import { MessageGroup } from "./message-group.model";
import { Message } from "./message.model";

export class Conversation {
  structuredMessages: Array<MessageGroup> = [];

  constructor(
    public messages: Array<Message>,
  ) {
    this.populateStructuredMessages(messages);
  }

  populateStructuredMessages(messages: Array<Message>) {
    this.structuredMessages = [];

    let previousMessage: Message;
    messages.forEach((message) => {
      if (!previousMessage) {
        this.structuredMessages.push(new MessageGroup(message.chatParticipant, [message]));
      } else {
        if (previousMessage.chatParticipant.id === message.chatParticipant.id) {
          this.structuredMessages[this.structuredMessages.length - 1].messages.push(message);
        } else {
          this.structuredMessages.push(new MessageGroup(message.chatParticipant, [message]));
        }
      }

      previousMessage = message;
    });
  }

  addMessage(message: Message) {
    if (this.messages.length === 0) {
      this.structuredMessages.push(new MessageGroup(message.chatParticipant, [message]));
    }

    const lastMessageGroup = this.structuredMessages[this.structuredMessages.length - 1];

    if (lastMessageGroup.chatParticipant.id === message.chatParticipant.id) {
      lastMessageGroup.messages.push(message);
    } else {
      this.structuredMessages.push(new MessageGroup(message.chatParticipant, [message]));
    }

    this.messages.push(message);
  }
}
