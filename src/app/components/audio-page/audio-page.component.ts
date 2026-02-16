import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-audio-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: `<app-placeholder-page
    title="Audio"
    description="In Development :)"
  />`,
})
export class AudioPageComponent {}
