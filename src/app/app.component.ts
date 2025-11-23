import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Routes } from '@angular/router';
import { NavTopComponent } from './components/nav-top/nav-top.component';
import { ChatComponent } from './components/chat/chat.component';
import { LandingComponent } from './components/landing/landing.component';
import { AssistantSidebarComponent } from './components/assistant-sidebar/assistant-sidebar.component';
import { AddAssistantDialogComponent } from './components/add-assistant-dialog/add-assistant-dialog.component';
import { Assistant } from './models/assistant.model';

export const routes: Routes = [{ path: '', component: LandingComponent }];

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    CommonModule,
    RouterOutlet,
    NavTopComponent,
    ChatComponent,
    AssistantSidebarComponent,
    AddAssistantDialogComponent,
  ],
})
export class AppComponent {
  sidebarOpen = false;
  addDialogOpen = false;
  editingAssistant: Assistant | null = null;
  selectedAssistant: Assistant | null = null;

  openSidebar(): void {
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  onAssistantSelected(assistant: Assistant): void {
    this.selectedAssistant = assistant;
    // Future: Could switch chat view to this assistant
  }

  onAddAssistantRequested(): void {
    this.editingAssistant = null;
    this.addDialogOpen = true;
  }

  onAssistantEditRequested(assistant: Assistant): void {
    this.editingAssistant = assistant;
    this.addDialogOpen = true;
  }

  onAssistantCreated(assistant: Assistant): void {
    this.selectedAssistant = assistant;
    this.editingAssistant = null;
    // Future: Could switch chat view to this assistant
  }

  onAssistantUpdated(assistant: Assistant): void {
    this.selectedAssistant = assistant;
    this.editingAssistant = null;
    // Future: Could switch chat view to this assistant
  }
}
