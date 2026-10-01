import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OpenTab } from '../../core/models/open-tab.model';

/**
 * Modal de escolha de aba. Usa <dialog> com showModal(): o navegador cuida de aria-modal,
 * de prender o foco e do Escape (evento `cancel`).
 */
@Component({
  selector: 'app-tab-picker',
  imports: [FormsModule],
  templateUrl: './tab-picker.html',
  styleUrl: './tab-picker.css',
  host: { '(click)': 'onBackdropClick($event)' },
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

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    afterNextRender(() => this.dialog().nativeElement.showModal());

    // O componente sai do DOM sem dialog.close(), entao o foco nao volta sozinho.
    inject(DestroyRef).onDestroy(() => previouslyFocused?.focus?.());
  }

  dismiss(): void {
    if (!this.creating()) {
      this.dismissed.emit();
    }
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.dismiss();
  }

  /** Clique no ::backdrop chega como clique no proprio <dialog>. */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.dismiss();
    }
  }

  hideBrokenFavicon(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.visibility = 'hidden';
  }
}
