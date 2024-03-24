import { IChatParticipant } from '../interfaces/chat-participant.interface';
import { IChatMessage } from '../interfaces/chat-message.interface';

export class MessageGroup {
  constructor(
    public chatParticipant: IChatParticipant,
    public messages: Array<IChatMessage>
  ) {}
}
