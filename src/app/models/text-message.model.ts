import { IChatParticipant } from '../interfaces/chat-participant.interface';
import { IChatMessage } from '../interfaces/chat-message.interface';

export class TextMessage implements IChatMessage {
  constructor(
    public chatParticipant: IChatParticipant,
    public text: string,
    public timestamp: Date
  ) {}

  toString() {
    return this.text;
  }
}
