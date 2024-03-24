import { IChatParticipant } from "./chat-participant.interface";

export interface IChatMessage {
  chatParticipant: IChatParticipant;
  text: string;
  timestamp: Date;
}
