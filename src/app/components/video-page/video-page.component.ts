import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-video-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: `<app-placeholder-page
    title="Video"
    description="Video editing and AI-powered video features are planned for Xenith. This section will host tools for editing and generating video content in the browser."
  />`,
})
export class VideoPageComponent {}
