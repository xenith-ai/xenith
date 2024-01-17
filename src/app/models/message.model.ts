import { ChatParticipant } from "../interfaces/chat-participant.model";

export class Message {
  constructor(
    public chatParticipant: ChatParticipant,
    public message: string,
    public timestamp: Date,
  ) { }
}
