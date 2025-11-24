import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, Routes, NavigationEnd } from '@angular/router';
import { NavTopComponent } from './components/nav-top/nav-top.component';
import { ChatComponent } from './components/chat/chat.component';
import { LandingComponent } from './components/landing/landing.component';
import { AssistantSidebarComponent } from './components/assistant-sidebar/assistant-sidebar.component';
import { AddAssistantDialogComponent } from './components/add-assistant-dialog/add-assistant-dialog.component';
import { Assistant } from './models/assistant.model';
import { AssistantService } from './services/assistant/assistant.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
export class AppComponent implements OnInit, OnDestroy {
  @HostBinding('class.sidebar-open') get sidebarOpenClass() {
    return this.sidebarOpen;
  }

  sidebarOpen = false;
  addDialogOpen = false;
  editingAssistant: Assistant | null = null;
  selectedAssistant: Assistant | null = null;
  isLandingPage = true;
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private assistantService: AssistantService
  ) {}

  ngOnInit(): void {
    // Track route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isLandingPage = event.url === '/' || event.url === '';
        this.updateSidebarVisibility();
      });

    // Check initial route
    this.isLandingPage = this.router.url === '/' || this.router.url === '';
    this.updateSidebarVisibility();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private updateSidebarVisibility(): void {
    // On desktop, sidebar should be open by default, but NOT on landing page
    if (window.innerWidth > 624 && !this.isLandingPage) { // 39em = 624px
      this.sidebarOpen = true;
    } else {
      this.sidebarOpen = false;
    }
  }

  openSidebar(): void {
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  onAssistantSelected(assistant: Assistant): void {
    this.selectedAssistant = assistant;
    // Navigate to chat page for this assistant
    this.router.navigate(['/chat', assistant.id]);
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
    this.assistantService.updateAssistant(assistant);
    this.selectedAssistant = assistant;
    this.editingAssistant = null;
    // Future: Could switch chat view to this assistant
  }

  onAssistantDeleted(assistant: Assistant): void {
    this.assistantService.removeAssistant(assistant.id);
    this.editingAssistant = null;
    // If the deleted assistant was selected, navigate to landing page
    if (this.selectedAssistant?.id === assistant.id) {
      this.selectedAssistant = null;
      this.router.navigate(['/']);
    }
  }
}
