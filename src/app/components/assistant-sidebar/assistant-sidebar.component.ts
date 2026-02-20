import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AssistantService } from '../../services/assistant/assistant.service';
import { AudioService } from '../../services/audio/audio.service';
import { LLMService } from '../../services/llm/llm.service';
import { ClipService } from '../../services/clip/clip.service';
import { Assistant } from '../../models/assistant.model';
import { Clip } from '../../models/clip.model';

@Component({
  selector: 'app-assistant-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './assistant-sidebar.component.html',
  styleUrl: './assistant-sidebar.component.scss',
})
export class AssistantSidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() assistantSelected = new EventEmitter<Assistant>();
  @Output() addAssistantRequested = new EventEmitter<void>();
  @Output() assistantEditRequested = new EventEmitter<Assistant>();

  @ViewChild('addClipsInput') addClipsInput: ElementRef<HTMLInputElement> | null = null;

  isStartingListening = false;
  private checkInterval: any = null;

  constructor(
    public assistantService: AssistantService,
    public audioService: AudioService,
    public clipService: ClipService,
    private llmService: LLMService,
    private cdr: ChangeDetectorRef,
    public router: Router
  ) {}

  get showAssistants(): boolean {
    const url = this.router.url;
    return url === '/' || url === '' || url.startsWith('/chat');
  }

  get showClips(): boolean {
    return this.router.url === '/video';
  }

  get clips(): Clip[] {
    return this.clipService.getClips();
  }

  triggerAddClips(): void {
    this.addClipsInput?.nativeElement?.click();
  }

  onClipsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input?.files;
    if (files?.length) {
      this.clipService.addClips(Array.from(files));
      input.value = '';
    }
  }

  async onTranscribeClip(clip: Clip): Promise<void> {
    await this.clipService.transcribeClip(clip);
    this.cdr.detectChanges();
  }

  get currentAssistantId(): string | null {
    const m = this.router.url.match(/^\/chat\/([^/]+)$/);
    return m ? m[1] : null;
  }

  navigateToChat(): void {
    const list = this.assistants;
    if (list.length === 0) {
      this.router.navigate(['/']);
      return;
    }
    const lastId = this.assistantService.getLastSelectedAssistantId();
    const target = lastId
      ? list.find(a => a.id === lastId) ?? list[0]
      : list[0];
    this.router.navigate(['/chat', target.id]);
  }

  isCurrentAssistant(assistant: Assistant): boolean {
    return this.currentAssistantId === assistant.id;
  }

  ngOnInit(): void {
    // Poll for triggered assistant changes (since we can't use observables easily)
    this.checkInterval = setInterval(() => {
      this.cdr.detectChanges();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  get assistants(): Assistant[] {
    return this.assistantService.getAssistants();
  }

  closeSidebar(): void {
    this.isOpenChange.emit(false);
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth <= 624) {
      this.closeSidebar();
    }
  }

  selectAssistant(assistant: Assistant): void {
    this.assistantSelected.emit(assistant);
    // Only close sidebar on mobile, or if navigating to a different assistant
    // On desktop chat pages, keep sidebar open
    if (window.innerWidth <= 624) { // 39em = 624px (mobile)
      this.closeSidebar();
    }
  }

  addAssistant(): void {
    this.addAssistantRequested.emit();
  }

  editAssistant(event: Event, assistant: Assistant): void {
    event.stopPropagation(); // Prevent triggering selectAssistant
    this.assistantEditRequested.emit(assistant);
  }

  getModelDisplayName(modelId: string): string {
    return this.llmService.getModelDisplayName(modelId);
  }

  isTriggered(assistant: Assistant): boolean {
    return this.assistantService.getTriggeredAssistantId() === assistant.id;
  }

  isAnyTriggered(): boolean {
    return this.assistantService.isAnyAssistantTriggered();
  }

  isInitializing(assistant: Assistant): boolean {
    return this.assistantService.isInitializingModel(assistant.id);
  }

  stopListening(): void {
    this.assistantService.stopListeningAndDeactivate();
    this.cdr.detectChanges();
  }

  async startListening(): Promise<void> {
    this.isStartingListening = true;
    this.cdr.detectChanges();
    try {
      await this.assistantService.startListeningAndActivate();
    } catch (err) {
      console.error('Failed to start listening', err);
    } finally {
      this.isStartingListening = false;
      this.cdr.detectChanges();
    }
  }
}

