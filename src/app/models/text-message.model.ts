import { IChatParticipant } from '../interfaces/chat-participant.interface';
import { IChatMessage } from '../interfaces/chat-message.interface';

export class TextMessage implements IChatMessage {
  /** 0-100 when this message represents download progress. */
  public progress?: number;

  constructor(
    public chatParticipant: IChatParticipant,
    public text: string,
    public timestamp: Date,
    progress?: number
  ) {
    if (progress !== undefined) this.progress = progress;
  }

  toString() {
    return this.text;
  }
}
