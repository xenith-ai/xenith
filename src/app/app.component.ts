import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Routes } from '@angular/router';
import { AudioRecorder } from './services/AudioRecorder/audio-recorder.service'
import { NavTopComponent } from "./components/nav-top/nav-top.component";
import { chatComponent } from "./components/chat/chat.component";
import { LandingComponent } from './components/landing/landing.component';

declare var window: any;

export const routes: Routes = [
  { path: '', component: LandingComponent }
];


@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [CommonModule, RouterOutlet, NavTopComponent, chatComponent]
})
export class AppComponent {
  constructor(private audioRecorder: AudioRecorder) { }
}
