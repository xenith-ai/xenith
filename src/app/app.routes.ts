import { Routes } from '@angular/router';
import { ChatPageComponent } from './components/chat-page/chat-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'chat' },
  { path: 'chat', component: ChatPageComponent },
  { path: 'chat/:assistantId', component: ChatPageComponent },
  { path: '**', redirectTo: 'chat' },
];
