import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavTopComponent } from './components/nav-top/nav-top.component';
import { AssistantSidebarComponent } from './components/assistant-sidebar/assistant-sidebar.component';
import { AddAssistantDialogComponent } from './components/add-assistant-dialog/add-assistant-dialog.component';
import { Assistant } from './models/assistant.model';
import { AssistantService } from './services/assistant/assistant.service';
import { filter, debounceTime } from 'rxjs/operators';
import { Subscription, fromEvent } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    CommonModule,
    RouterOutlet,
    NavTopComponent,
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
  private resizeSubscription?: Subscription;
  private closeSidebarHandler?: () => void;

  get isOnLandingPage(): boolean {
    return this.isLandingPage;
  }

  constructor(
    private router: Router,
    private assistantService: AssistantService
  ) {}

  ngOnInit(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects ?? event.url;
        this.isLandingPage = url === '/' || url === '';
        const chatMatch = url.match(/^\/chat\/([^/]+)$/);
        if (chatMatch) {
          this.assistantService.setLastSelectedAssistantId(chatMatch[1]);
        }
        this.updateSidebarVisibility();
      });

    this.isLandingPage = this.router.url === '/' || this.router.url === '';
    this.updateSidebarVisibility();

    this.closeSidebarHandler = () => {
      if (this.isLandingPage && this.sidebarOpen) {
        this.closeSidebar();
      }
    };
    window.addEventListener('close-sidebar', this.closeSidebarHandler);

    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(debounceTime(100))
      .subscribe(() => this.updateSidebarVisibility());
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.resizeSubscription?.unsubscribe();
    if (this.closeSidebarHandler) {
      window.removeEventListener('close-sidebar', this.closeSidebarHandler);
    }
  }

  private updateSidebarVisibility(): void {
    // Desktop: sidebar open by default, but not on landing
    if (window.innerWidth > 624 && !this.isLandingPage) {
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
    const alreadyOnThisChat = this.router.url.startsWith(`/chat/${assistant.id}`);
    if (!alreadyOnThisChat) {
      this.selectedAssistant = assistant;
      this.router.navigate(['/chat', assistant.id]);
    }
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
  }

  onAssistantUpdated(assistant: Assistant): void {
    this.assistantService.updateAssistant(assistant);
    this.selectedAssistant = assistant;
    this.editingAssistant = null;
  }

  onAssistantDeleted(assistant: Assistant): void {
    this.assistantService.removeAssistant(assistant.id);
    this.editingAssistant = null;
    if (this.assistantService.getLastSelectedAssistantId() === assistant.id) {
      this.assistantService.setLastSelectedAssistantId(null);
    }
    if (this.selectedAssistant?.id === assistant.id) {
      this.selectedAssistant = null;
      this.router.navigate(['/']);
    }
  }
}
