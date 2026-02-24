import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './placeholder-page.component.html',
  styleUrl: './placeholder-page.component.scss',
})
export class PlaceholderPageComponent {
  @Input() title = 'In Development';
  @Input() description: string | null = null;
  @Input() gifSrc: string | null = null;
}
