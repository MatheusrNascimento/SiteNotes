import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReferenceCreator } from '../../core/services/reference-creator.service';

const TITLE_LOOKUP_DEBOUNCE_MS = 450;

export interface NewReferenceDraft {
  url: string;
  title: string;
  tags: string[];
}

@Component({
  selector: 'app-add-reference-form',
  imports: [FormsModule],
  templateUrl: './add-reference-form.html',
  styleUrl: './add-reference-form.css',
})
export class AddReferenceForm {
  private readonly creator = inject(ReferenceCreator);

  readonly submitted = output<NewReferenceDraft>();

  readonly lookingUpTitle = signal(false);

  readonly url = signal('');
  readonly title = signal('');
  readonly tags = signal('');

  private titleLookupHandle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelTitleLookup());
  }

  onUrlChange(url: string): void {
    this.url.set(url);
    this.cancelTitleLookup();

    this.titleLookupHandle = setTimeout(() => {
      this.titleLookupHandle = null;
      void this.lookupTitleFromUrl(url);
    }, TITLE_LOOKUP_DEBOUNCE_MS);
  }

  submit(): void {
    const url = this.url().trim();
    if (!url) {
      return;
    }

    const tags = this.tags()
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    this.submitted.emit({ url, title: this.title().trim(), tags });
  }

  private cancelTitleLookup(): void {
    if (this.titleLookupHandle) {
      clearTimeout(this.titleLookupHandle);
      this.titleLookupHandle = null;
    }
  }

  private async lookupTitleFromUrl(url: string): Promise<void> {
    const trimmed = url.trim();
    if (!trimmed || this.title().trim()) {
      return;
    }

    this.lookingUpTitle.set(true);
    try {
      const title = await this.creator.resolveTitle(trimmed, '');
      if (!this.title().trim() && title) {
        this.title.set(title);
      }
    } finally {
      this.lookingUpTitle.set(false);
    }
  }
}
