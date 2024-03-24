import { IChatParticipant } from '../interfaces/chat-participant.interface';
import { IChatMessage } from '../interfaces/chat-message.interface';

export class ButtonMessage implements IChatMessage {
  constructor(
    public chatParticipant: IChatParticipant,
    public text: string,
    public timestamp: Date,
    public image: string,
    public styleClass: string,
    public onClick: () => void
  ) {}

  toString() {
    return this.text;
  }
}
