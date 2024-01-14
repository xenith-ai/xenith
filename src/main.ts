import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { HttpClientModule } from '@angular/common/http';
import { AudioRecorder } from './app/services/AudioRecorder/audio-recorder.service';
import { importProvidersFrom } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(HttpClientModule),
    AudioRecorder
  ],
}).catch(err => console.error(err));
