import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AudioRecorder } from './services/AudioRecorder/audio-recorder.service'

declare var window: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'xenith';

  constructor(private audioRecorder: AudioRecorder) { }

  startRecording() {
    this.audioRecorder.initRecording();
  }

  initializeWhisper() {
    this.audioRecorder.initializeWhisper();
  }

  loadModel() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    this.audioRecorder.loadModel();
  }
}
