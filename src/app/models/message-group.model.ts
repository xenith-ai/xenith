import { ChatParticipant } from "../interfaces/chat-participant.interface";
import { Message } from "./message.model";

export class MessageGroup {
  constructor(
    public chatParticipant: ChatParticipant,
    public messages: Array<Message>,
  ) { }
}
