import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OpenTab } from '../../core/models/open-tab.model';

@Component({
  selector: 'app-tab-picker',
  imports: [FormsModule],
  templateUrl: './tab-picker.html',
  styleUrl: './tab-picker.css',
})
export class TabPicker {
  readonly tabs = input.required<OpenTab[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly creating = input(false);

  readonly picked = output<OpenTab>();
  readonly dismissed = output<void>();

  readonly search = signal('');
  readonly filteredTabs = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.tabs();
    }

    return this.tabs().filter(
      (tab) => tab.title.toLowerCase().includes(term) || tab.url.toLowerCase().includes(term),
    );
  });

  hideBrokenFavicon(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.visibility = 'hidden';
  }
}
