import { IChatParticipant } from '../interfaces/chat-participant.interface';

export class User implements IChatParticipant {
  constructor(
    public id: string,
    public name: string,
    public avatar: string,
    public messageColor: string = 'linear-gradient(315deg, hsl(225, 30%, 35%) 0%, hsl(240, 30%, 30%) 100%)'
  ) {}
}
