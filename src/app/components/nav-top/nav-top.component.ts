import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-nav-top',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './nav-top.component.html',
  styleUrl: './nav-top.component.scss',
})
export class NavTopComponent {
  @Output() menuClick = new EventEmitter<void>();

  onMenuClick(): void {
    this.menuClick.emit();
  }
}
