import { MessageGroup } from './message-group.model';
import { IChatMessage } from '../interfaces/chat-message.interface';

export class Conversation {
  public structuredMessages: Array<MessageGroup> = [];

  constructor(public messages: Array<IChatMessage>) {
    this.populateStructuredMessages(messages);
  }

  public addMessage(message: IChatMessage) {
    if (this.messages.length === 0) {
      this.structuredMessages.push(
        new MessageGroup(message.chatParticipant, [message])
      );
    } else {
      const lastMessageGroup =
        this.structuredMessages[this.structuredMessages.length - 1];

      if (lastMessageGroup.chatParticipant.id === message.chatParticipant.id) {
        lastMessageGroup.messages.push(message);
      } else {
        this.structuredMessages.push(
          new MessageGroup(message.chatParticipant, [message])
        );
      }
    }

    this.messages.push(message);
  }

  private populateStructuredMessages(messages: Array<IChatMessage>) {
    this.structuredMessages = [];

    let previousMessage: IChatMessage;
    messages.forEach((message) => {
      if (!previousMessage) {
        this.structuredMessages.push(
          new MessageGroup(message.chatParticipant, [message])
        );
      } else {
        if (previousMessage.chatParticipant.id === message.chatParticipant.id) {
          this.structuredMessages[
            this.structuredMessages.length - 1
          ].messages.push(message);
        } else {
          this.structuredMessages.push(
            new MessageGroup(message.chatParticipant, [message])
          );
        }
      }

      previousMessage = message;
    });
  }
}
