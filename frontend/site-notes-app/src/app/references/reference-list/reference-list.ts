import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Subject, catchError, debounce, firstValueFrom, of, switchMap, timer } from 'rxjs';
import { OpenTab } from '../../core/models/open-tab.model';
import { Reference } from '../../core/models/reference.model';
import { BrowserTabsService } from '../../core/services/browser-tabs.service';
import { ReferenceCreator } from '../../core/services/reference-creator.service';
import { ReferencesService } from '../../core/services/references.service';
import { AddReferenceForm, NewReferenceDraft } from '../add-reference-form/add-reference-form';
import { ReferenceCard } from '../../shared/ui/reference-card/reference-card';
import { SortDirection, SortToggle } from '../../shared/ui/sort-toggle/sort-toggle';
import { TabPicker } from '../tab-picker/tab-picker';

const TAB_PROMPT_SESSION_KEY = 'sitenotes.tabPromptShown';
const FILTER_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-reference-list',
  imports: [FormsModule, AddReferenceForm, TabPicker, SortToggle, ReferenceCard],
  templateUrl: './reference-list.html',
  styleUrl: './reference-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceList {
  private readonly referencesService = inject(ReferencesService);
  private readonly browserTabs = inject(BrowserTabsService);
  private readonly creator = inject(ReferenceCreator);
  private readonly destroyRef = inject(DestroyRef);

  readonly references = signal<Reference[]>([]);
  readonly sortDirection = signal<SortDirection>('desc');
  readonly sortedReferences = computed(() => {
    const direction = this.sortDirection();
    return [...this.references()].sort((left, right) => {
      const delta = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      return direction === 'asc' ? delta : -delta;
    });
  });
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showAddForm = signal(false);

  readonly extensionAvailable = signal(false);
  readonly showExtensionHint = signal(false);
  readonly showTabPicker = signal(false);
  readonly openTabs = signal<OpenTab[]>([]);
  readonly isLoadingTabs = signal(false);
  readonly isCreatingFromTab = signal(false);
  readonly tabPickerError = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly tagFilter = signal('');

  private readonly reload$ = new Subject<{ debounced: boolean }>();

  constructor() {
    this.watchReloads();
    this.load();
    void this.detectOpenTabsOnStartup();
  }

  load(): void {
    this.reload$.next({ debounced: false });
  }

  onFilterChange(): void {
    this.reload$.next({ debounced: true });
  }

  private watchReloads(): void {
    this.reload$
      .pipe(
        debounce(({ debounced }) => (debounced ? timer(FILTER_DEBOUNCE_MS) : of(0))),
        switchMap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);

          return this.referencesService
            .getAll(this.searchTerm() || undefined, this.tagFilter() || undefined)
            .pipe(
              catchError(() => {
                this.errorMessage.set(
                  'Nao foi possivel carregar as referencias. Verifique se a API esta rodando.',
                );
                this.isLoading.set(false);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((refs) => {
        this.references.set(refs);
        this.isLoading.set(false);
      });
  }

  toggleAddForm(): void {
    this.showAddForm.set(!this.showAddForm());
  }

  async addReference(draft: NewReferenceDraft): Promise<void> {
    try {
      await this.creator.createOrOpen(draft.url, draft.title, draft.tags);
      this.showAddForm.set(false);
    } catch {
      this.errorMessage.set('Nao foi possivel adicionar a referencia.');
    }
  }

  async deleteReference(id: number): Promise<void> {
    if (!confirm('Excluir esta referencia e todas as suas anotacoes?')) {
      return;
    }

    try {
      await firstValueFrom(this.referencesService.delete(id));
      this.load();
    } catch {
      this.errorMessage.set('Nao foi possivel excluir a referencia.');
    }
  }

  async askForOpenTab(): Promise<void> {
    this.tabPickerError.set(null);
    this.isLoadingTabs.set(true);
    this.showTabPicker.set(true);
    sessionStorage.setItem(TAB_PROMPT_SESSION_KEY, '1');

    try {
      const available = this.extensionAvailable() || (await this.browserTabs.isAvailable());
      this.extensionAvailable.set(available);

      if (!available) {
        this.openTabs.set([]);
        this.tabPickerError.set(
          'A extensao SiteNotes nao respondeu. Recarregue a extensao em about:debugging e depois recarregue esta pagina.',
        );
        return;
      }

      const tabs = await this.browserTabs.getOpenTabs();
      this.openTabs.set(tabs);

      if (tabs.length === 0) {
        this.tabPickerError.set('Nenhuma outra aba http/https foi encontrada neste navegador.');
      }
    } catch {
      this.tabPickerError.set('Nao foi possivel ler as abas abertas.');
    } finally {
      this.isLoadingTabs.set(false);
    }
  }

  skipTabPicker(): void {
    this.showTabPicker.set(false);
    sessionStorage.setItem(TAB_PROMPT_SESSION_KEY, '1');
  }

  dismissExtensionHint(): void {
    this.showExtensionHint.set(false);
    sessionStorage.setItem(TAB_PROMPT_SESSION_KEY, '1');
  }

  async selectOpenTab(tab: OpenTab): Promise<void> {
    if (this.isCreatingFromTab()) {
      return;
    }

    this.isCreatingFromTab.set(true);
    this.tabPickerError.set(null);

    try {
      const title = await this.creator.resolveTitle(tab.url, tab.title);
      await this.creator.createOrOpen(tab.url, title);
      this.showTabPicker.set(false);
    } catch {
      this.tabPickerError.set('Nao foi possivel criar a nota a partir desta aba.');
    } finally {
      this.isCreatingFromTab.set(false);
    }
  }

  private async detectOpenTabsOnStartup(): Promise<void> {
    const alreadyAsked = sessionStorage.getItem(TAB_PROMPT_SESSION_KEY) === '1';
    const available = await this.browserTabs.isAvailable();
    this.extensionAvailable.set(available);

    if (!available) {
      this.showExtensionHint.set(!alreadyAsked);
      return;
    }

    if (alreadyAsked) {
      return;
    }

    await this.askForOpenTab();
  }
}
