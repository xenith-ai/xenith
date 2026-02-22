import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-image-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: `<app-placeholder-page
    title="Image"
    description="In Development :)"
  />`,
})
export class ImagePageComponent {}
