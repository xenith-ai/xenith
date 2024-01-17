import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AudioRecorder } from './services/AudioRecorder/audio-recorder.service'
import { NavTopComponent } from "./components/nav-top/nav-top.component";

declare var window: any;

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [CommonModule, RouterOutlet, NavTopComponent]
})
export class AppComponent {
  constructor(private audioRecorder: AudioRecorder) { }
}
