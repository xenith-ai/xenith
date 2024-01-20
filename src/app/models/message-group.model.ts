import { IChatParticipant } from "../interfaces/chat-participant.interface";
import { Message } from "./message.model";

export class MessageGroup {
  constructor(
    public chatParticipant: IChatParticipant,
    public messages: Array<Message>,
  ) { }
}
