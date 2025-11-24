import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Routes } from '@angular/router';
import { NavTopComponent } from './components/nav-top/nav-top.component';
import { ChatComponent } from './components/chat/chat.component';
import { LandingComponent } from './components/landing/landing.component';

export const routes: Routes = [{ path: '', component: LandingComponent }];

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [CommonModule, RouterOutlet, NavTopComponent, ChatComponent],
})
export class AppComponent {
  constructor() {}
}
