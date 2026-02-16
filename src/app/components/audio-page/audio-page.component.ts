import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-audio-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: `<app-placeholder-page
    title="Audio"
    description="Audio editing and AI-powered audio features are planned for Xenith. This section will host tools for editing and generating audio in the browser, alongside the existing voice assistant capabilities."
  />`,
})
export class AudioPageComponent {}
