import { Component } from '@angular/core';
import { PlaceholderPageComponent } from '../placeholder-page/placeholder-page.component';

@Component({
  selector: 'app-image-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  template: `<app-placeholder-page
    title="Image"
    description="in development"
    gifSrc="assets/img/tohru-dragon-maid.gif"
  />`,
})
export class ImagePageComponent {}
