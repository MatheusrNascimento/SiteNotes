import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OpenTab } from '../../core/models/open-tab.model';
import { Reference } from '../../core/models/reference.model';
import { BrowserTabsService } from '../../core/services/browser-tabs.service';
import { PageMetadataService } from '../../core/services/page-metadata.service';
import { ReferencesService } from '../../core/services/references.service';
import { canonicalReferenceUrl, cleanPageTitle } from '../../core/utils/url.util';

const TAB_PROMPT_SESSION_KEY = 'sitenotes.tabPromptShown';

@Component({
  selector: 'app-reference-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './reference-list.html',
  styleUrl: './reference-list.css',
})
export class ReferenceList {
  private readonly referencesService = inject(ReferencesService);
  private readonly browserTabs = inject(BrowserTabsService);
  private readonly pageMetadata = inject(PageMetadataService);
  private readonly router = inject(Router);

  readonly references = signal<Reference[]>([]);
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
  readonly lookingUpTitle = signal(false);

  searchTerm = '';
  tagFilter = '';
  tabSearch = '';

  newUrl = '';
  newTitle = '';
  newTags = '';

  private titleLookupHandle: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
    void this.detectOpenTabsOnStartup();
  }

  get filteredOpenTabs(): OpenTab[] {
    const term = this.tabSearch.trim().toLowerCase();
    if (!term) {
      return this.openTabs();
    }

    return this.openTabs().filter(
      (tab) => tab.title.toLowerCase().includes(term) || tab.url.toLowerCase().includes(term),
    );
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.referencesService.getAll(this.searchTerm || undefined, this.tagFilter || undefined).subscribe({
      next: (refs) => {
        this.references.set(refs);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Nao foi possivel carregar as referencias. Verifique se a API esta rodando.');
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.load();
  }

  toggleAddForm(): void {
    this.showAddForm.set(!this.showAddForm());
  }

  onUrlChange(url: string): void {
    this.newUrl = url;

    if (this.titleLookupHandle) {
      clearTimeout(this.titleLookupHandle);
    }

    this.titleLookupHandle = setTimeout(() => {
      void this.lookupTitleFromUrl(url);
    }, 450);
  }

  addReference(): void {
    const url = this.newUrl.trim();
    if (!url) {
      return;
    }

    const tags = this.newTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    void this.createOrOpenReference(url, this.newTitle.trim(), tags).then((created) => {
      if (!created) {
        return;
      }

      this.newUrl = '';
      this.newTitle = '';
      this.newTags = '';
      this.showAddForm.set(false);
    });
  }

  deleteReference(id: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!confirm('Excluir esta referencia e todas as suas anotacoes?')) {
      return;
    }

    this.referencesService.delete(id).subscribe({
      next: () => this.load(),
      error: () => this.errorMessage.set('Nao foi possivel excluir a referencia.'),
    });
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

  hideBrokenFavicon(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.visibility = 'hidden';
  }

  skipTabPicker(): void {
    this.showTabPicker.set(false);
    this.tabSearch = '';
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
      const title = await this.resolveTitle(tab.url, tab.title);
      const created = await this.createOrOpenReference(tab.url, title);
      if (created) {
        this.showTabPicker.set(false);
        this.tabSearch = '';
      }
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

  private async lookupTitleFromUrl(url: string): Promise<void> {
    const trimmed = url.trim();
    if (!trimmed || this.newTitle.trim()) {
      return;
    }

    this.lookingUpTitle.set(true);
    try {
      const title = await this.resolveTitle(trimmed, '');
      if (!this.newTitle.trim() && title) {
        this.newTitle = title;
      }
    } finally {
      this.lookingUpTitle.set(false);
    }
  }

  private async resolveTitle(url: string, fallbackTitle: string): Promise<string> {
    const metadata = await firstValueFrom(this.pageMetadata.get(url));
    const fromPage = cleanPageTitle(metadata?.title ?? '');
    if (fromPage && metadata?.source !== 'fallback' && metadata?.source !== 'blocked-host') {
      return fromPage;
    }

    const fromTab = cleanPageTitle(fallbackTitle);
    if (fromTab) {
      return fromTab;
    }

    return fromPage || url;
  }

  private async createOrOpenReference(url: string, title: string, tags: string[] = []): Promise<boolean> {
    const existing = await this.findExistingReference(url);
    if (existing) {
      await this.router.navigate(['/references', existing.id]);
      return true;
    }

    try {
      const created = await firstValueFrom(
        this.referencesService.create({
          url,
          title: title || url,
          tags,
        }),
      );
      await this.router.navigate(['/references', created.id]);
      return true;
    } catch {
      this.errorMessage.set('Nao foi possivel adicionar a referencia.');
      return false;
    }
  }

  private async findExistingReference(url: string): Promise<Reference | undefined> {
    const canonical = canonicalReferenceUrl(url);

    try {
      const known = await firstValueFrom(this.referencesService.getAll());
      return known.find((reference) => canonicalReferenceUrl(reference.url) === canonical);
    } catch {
      return this.references().find((reference) => canonicalReferenceUrl(reference.url) === canonical);
    }
  }
}
