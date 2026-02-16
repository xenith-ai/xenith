import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-video-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: `<app-placeholder-page
    title="Video"
    description="In Development :)"
  />`,
})
export class VideoPageComponent {}
