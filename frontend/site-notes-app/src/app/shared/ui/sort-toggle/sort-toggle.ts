import { Component, input, model } from '@angular/core';

export type SortDirection = 'desc' | 'asc';

@Component({
  selector: 'app-sort-toggle',
  template: `
    <div class="sort-control" role="group" [attr.aria-label]="label()">
      <button
        type="button"
        [attr.aria-pressed]="direction() === 'desc'"
        (click)="direction.set('desc')"
      >
        Mais recentes
      </button>
      <button
        type="button"
        [attr.aria-pressed]="direction() === 'asc'"
        (click)="direction.set('asc')"
      >
        Mais antigos
      </button>
    </div>
  `,
})
export class SortToggle {
  readonly direction = model.required<SortDirection>();
  readonly label = input.required<string>();
}
