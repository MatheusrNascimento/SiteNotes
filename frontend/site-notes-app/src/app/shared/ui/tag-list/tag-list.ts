import { Component, input } from '@angular/core';

@Component({
  selector: 'app-tag-list',
  template: `
    @for (tag of tags(); track tag) {
      <span class="tag">{{ tag }}</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
  `,
})
export class TagList {
  readonly tags = input.required<readonly string[]>();
}
