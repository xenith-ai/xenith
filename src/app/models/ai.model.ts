import { ChatParticipant } from "../interfaces/chat-participant.interface";

export class AI implements ChatParticipant {
  constructor(
    public id: string,
    public name: string,
    public avatar: string,
  ) { }
}
