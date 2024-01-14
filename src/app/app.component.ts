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
    console.log(window.Module);
    this.audioRecorder.initRecording();
    console.log(window.Module);
  }

  initializeWhisper() {
    console.log(window.Module);
    this.audioRecorder.initializeWhisper();
    console.log(window.Module);
  }

  loadModel() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    console.log(window.Module);
    this.audioRecorder.loadModel();
    console.log(window.Module);
  }
}
