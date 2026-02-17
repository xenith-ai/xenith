import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { ChatPageComponent } from './components/chat-page/chat-page.component';
import { AboutPageComponent } from './components/about-page/about-page.component';
import { VideoPageComponent } from './components/video-page/video-page.component';
import { AudioPageComponent } from './components/audio-page/audio-page.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'chat', pathMatch: 'full', redirectTo: '' },
  { path: 'chat/:assistantId', component: ChatPageComponent },
  { path: 'video', component: VideoPageComponent },
  { path: 'audio', component: AudioPageComponent },
  { path: 'mission', component: AboutPageComponent },
  { path: 'about', component: AboutPageComponent },
];
