import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reference } from '../../../core/models/reference.model';
import { TagList } from '../tag-list/tag-list';

@Component({
  selector: 'app-reference-card',
  imports: [DatePipe, RouterLink, TagList],
  templateUrl: './reference-card.html',
  styleUrl: './reference-card.css',
})
export class ReferenceCard {
  readonly reference = input.required<Reference>();
  readonly deleteRequested = output<number>();

  readonly host = computed(() => {
    const url = this.reference().url;
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  });

  requestDelete(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.deleteRequested.emit(this.reference().id);
  }
}
