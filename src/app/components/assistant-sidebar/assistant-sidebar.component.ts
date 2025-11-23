import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssistantService } from '../../services/assistant/assistant.service';
import { Assistant } from '../../models/assistant.model';

@Component({
  selector: 'app-assistant-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assistant-sidebar.component.html',
  styleUrl: './assistant-sidebar.component.scss',
})
export class AssistantSidebarComponent {
  @Input() isOpen: boolean = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() assistantSelected = new EventEmitter<Assistant>();
  @Output() addAssistantRequested = new EventEmitter<void>();

  constructor(public assistantService: AssistantService) {}

  get assistants(): Assistant[] {
    return this.assistantService.getAssistants();
  }

  closeSidebar(): void {
    this.isOpenChange.emit(false);
  }

  selectAssistant(assistant: Assistant): void {
    this.assistantSelected.emit(assistant);
    this.closeSidebar();
  }

  addAssistant(): void {
    this.addAssistantRequested.emit();
  }
}

