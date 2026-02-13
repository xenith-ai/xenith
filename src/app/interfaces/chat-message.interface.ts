import { IChatParticipant } from "./chat-participant.interface";

export interface IChatMessage {
  chatParticipant: IChatParticipant;
  text: string;
  timestamp: Date;
  /** When set (0-100), message is shown as a download progress bar. */
  progress?: number;
}
