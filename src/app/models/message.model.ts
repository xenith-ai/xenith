import { IChatParticipant } from "../interfaces/chat-participant.interface";

export class Message {
  constructor(
    public chatParticipant: IChatParticipant,
    public message: string,
    public timestamp: Date,
  ) { }

  toString() {
    return this.message;
  }
}
