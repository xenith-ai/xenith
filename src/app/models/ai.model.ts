import { IChatParticipant } from "../interfaces/chat-participant.interface";

export class AI implements IChatParticipant {
  constructor(
    public id: string,
    public name: string,
    public avatar: string,
  ) { }
}
