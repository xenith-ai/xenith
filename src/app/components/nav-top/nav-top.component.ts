import { Component, EventEmitter, Output, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssistantService } from '../../services/assistant/assistant.service';

@Component({
  selector: 'app-nav-top',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav-top.component.html',
  styleUrl: './nav-top.component.scss',
})
export class NavTopComponent implements OnInit, OnDestroy {
  @Input() isLandingPage: boolean = false;
  @Output() menuClick = new EventEmitter<void>();

  private checkInterval: any = null;

  constructor(
    public assistantService: AssistantService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkInterval = setInterval(() => {
      this.cdr.detectChanges();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  isAnyTriggered(): boolean {
    return this.assistantService.isAnyAssistantTriggered();
  }
}
