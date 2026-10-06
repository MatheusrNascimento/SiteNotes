import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReferenceCreator } from '../../core/services/reference-creator.service';
import { parseTags } from '../../core/utils/tags.util';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddReferenceForm {
  private readonly creator = inject(ReferenceCreator);

  readonly submitted = output<NewReferenceDraft>();

  readonly lookingUpTitle = signal(false);

  readonly url = signal('');
  readonly title = signal('');
  readonly tags = signal('');

  private titleLookupHandle: ReturnType<typeof setTimeout> | null = null;
  /** Identifica a busca de titulo mais recente, para a mais antiga nao sobrescrever estado dela. */
  private titleLookupSequence = 0;

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

    this.submitted.emit({ url, title: this.title().trim(), tags: parseTags(this.tags()) });
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

    const sequence = ++this.titleLookupSequence;
    this.lookingUpTitle.set(true);
    try {
      const title = await this.creator.resolveTitle(trimmed, '');
      // A busca pode levar segundos; se uma busca mais nova ja comecou (ou a URL mudou)
      // enquanto esta estava em voo, descarta o resultado para nao aplicar o titulo de
      // uma URL que nao esta mais no campo.
      if (sequence !== this.titleLookupSequence || this.url().trim() !== trimmed) {
        return;
      }

      if (!this.title().trim() && title) {
        this.title.set(title);
      }
    } finally {
      if (sequence === this.titleLookupSequence) {
        this.lookingUpTitle.set(false);
      }
    }
  }
}
