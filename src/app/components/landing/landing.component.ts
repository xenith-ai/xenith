import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { chatComponent } from "../chat/chat.component";

@Component({
    selector: 'app-landing',
    standalone: true,
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss',
    imports: [CommonModule, RouterOutlet, chatComponent]
})
export class LandingComponent {
  constructor() { }
}
