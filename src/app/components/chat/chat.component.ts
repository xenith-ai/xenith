import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class chatComponent {
  constructor() { }
}
