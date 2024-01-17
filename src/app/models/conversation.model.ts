import { Message } from "./message.model";

export class Conversation {
  constructor(
    public messages: Array<Message>,
  ) { }
}
