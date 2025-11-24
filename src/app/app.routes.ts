import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { ChatPageComponent } from './components/chat-page/chat-page.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'chat/:assistantId', component: ChatPageComponent }
];
