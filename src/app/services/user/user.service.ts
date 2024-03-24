import { Injectable } from '@angular/core';
import { User } from '../../models/user.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor() {}

  public createUser() {
    return new User(uuidv4(), 'Shane Duffy', 'assets/dev/shane.webp');
  }
}
