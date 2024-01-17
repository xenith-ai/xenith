import { ChatParticipant } from "../interfaces/chat-participant.model";

export class User implements ChatParticipant {
  constructor(
    public id: string,
    public name: string,
    public avatar: string,
  ) { }
}
