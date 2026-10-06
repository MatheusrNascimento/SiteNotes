import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OpenTab } from '../../core/models/open-tab.model';
import { Reference } from '../../core/models/reference.model';
import { BrowserTabsService } from '../../core/services/browser-tabs.service';
import { ReferenceCreator } from '../../core/services/reference-creator.service';
import { ReferencesService } from '../../core/services/references.service';
import { ReferenceList } from './reference-list';

const TAB_PROMPT_SESSION_KEY = 'sitenotes.tabPromptShown';
const FILTER_DEBOUNCE_MS = 300;

function reference(id: number, updatedAt: string): Reference {
  return {
    id,
    url: `https://example.com/${id}`,
    title: `Ref ${id}`,
    tags: [],
    createdAt: updatedAt,
    updatedAt,
  };
}

function tab(id: number, title: string, url: string): OpenTab {
  return { id, windowId: 1, title, url, favIconUrl: '', active: false };
}

describe('ReferenceList', () => {
  let getAll: ReturnType<typeof vi.fn>;
  let deleteRef: ReturnType<typeof vi.fn>;
  let isAvailable: ReturnType<typeof vi.fn>;
  let getOpenTabs: ReturnType<typeof vi.fn>;
  let createOrOpen: ReturnType<typeof vi.fn>;
  let resolveTitle: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    sessionStorage.clear();

    getAll = vi.fn().mockReturnValue(of([]));
    deleteRef = vi.fn().mockReturnValue(of(undefined));
    isAvailable = vi.fn().mockResolvedValue(false);
    getOpenTabs = vi.fn().mockResolvedValue([]);
    createOrOpen = vi.fn().mockResolvedValue(undefined);
    resolveTitle = vi.fn().mockResolvedValue('Titulo resolvido');

    await TestBed.configureTestingModule({
      providers: [
        { provide: ReferencesService, useValue: { getAll, delete: deleteRef } },
        { provide: BrowserTabsService, useValue: { isAvailable, getOpenTabs } },
        { provide: ReferenceCreator, useValue: { createOrOpen, resolveTitle } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  /** O construtor ja dispara load() e detectOpenTabsOnStartup(); flush deixa essas promises resolverem. */
  async function flush(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  async function createComponent(): Promise<ReferenceList> {
    const component = TestBed.createComponent(ReferenceList).componentInstance;
    await flush();
    return component;
  }

  describe('sortedReferences', () => {
    it('ordena por updatedAt conforme sortDirection', async () => {
      const older = reference(1, '2026-01-01T00:00:00Z');
      const newer = reference(2, '2026-02-01T00:00:00Z');
      getAll.mockReturnValue(of([older, newer]));

      const component = await createComponent();

      expect(component.sortDirection()).toBe('desc');
      expect(component.sortedReferences().map((r) => r.id)).toEqual([2, 1]);

      component.sortDirection.set('asc');
      expect(component.sortedReferences().map((r) => r.id)).toEqual([1, 2]);
    });
  });

  describe('onFilterChange', () => {
    it('so recarrega depois do debounce de 300ms', async () => {
      vi.useFakeTimers();
      const component = TestBed.createComponent(ReferenceList).componentInstance;
      await vi.advanceTimersByTimeAsync(0);
      getAll.mockClear();

      component.onFilterChange();
      expect(getAll).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(FILTER_DEBOUNCE_MS - 1);
      expect(getAll).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(getAll).toHaveBeenCalledTimes(1);
    });

    it('load() recarrega imediatamente, sem debounce', async () => {
      vi.useFakeTimers();
      const component = TestBed.createComponent(ReferenceList).componentInstance;
      await vi.advanceTimersByTimeAsync(0);
      getAll.mockClear();

      component.load();
      await vi.advanceTimersByTimeAsync(0);

      expect(getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('addReference', () => {
    it('sucesso chama creator.createOrOpen e fecha o formulario', async () => {
      const component = await createComponent();
      component.showAddForm.set(true);

      await component.addReference({ url: 'https://a.com', title: 'A', tags: ['x'] });

      expect(createOrOpen).toHaveBeenCalledWith('https://a.com', 'A', ['x']);
      expect(component.showAddForm()).toBe(false);
      expect(component.errorMessage()).toBeNull();
    });

    it('erro da API seta errorMessage com a mensagem de apiErrorMessage', async () => {
      createOrOpen.mockRejectedValue(
        new HttpErrorResponse({ status: 400, error: { detail: 'Url invalida.' } }),
      );
      const component = await createComponent();
      component.showAddForm.set(true);

      await component.addReference({ url: 'invalida', title: '', tags: [] });

      expect(component.errorMessage()).toBe('Url invalida.');
      expect(component.showAddForm()).toBe(true);
    });
  });

  describe('deleteReference', () => {
    it('nao chama o servico quando a confirmacao e cancelada', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const component = await createComponent();

      await component.deleteReference(5);

      expect(deleteRef).not.toHaveBeenCalled();
    });

    it('confirmado chama referencesService.delete e recarrega', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const component = await createComponent();
      getAll.mockClear();

      await component.deleteReference(5);

      expect(deleteRef).toHaveBeenCalledWith(5);
      expect(getAll).toHaveBeenCalledTimes(1);
    });

    it('erro da API seta errorMessage', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const component = await createComponent();
      deleteRef.mockImplementationOnce(() => {
        throw new HttpErrorResponse({
          status: 404,
          error: { detail: 'Referencia nao encontrada.' },
        });
      });

      await component.deleteReference(5);

      expect(component.errorMessage()).toBe('Referencia nao encontrada.');
    });
  });

  describe('deteccao de abas no startup e askForOpenTab', () => {
    it('extensao disponivel com abas: mostra o tab picker sem erro', async () => {
      isAvailable.mockResolvedValue(true);
      const tabs = [tab(1, 'Pagina A', 'https://a.com'), tab(2, 'Pagina B', 'https://b.com')];
      getOpenTabs.mockResolvedValue(tabs);

      const component = await createComponent();

      expect(component.extensionAvailable()).toBe(true);
      expect(component.showTabPicker()).toBe(true);
      expect(component.openTabs()).toEqual(tabs);
      expect(component.tabPickerError()).toBeNull();
      expect(component.isLoadingTabs()).toBe(false);
      expect(sessionStorage.getItem(TAB_PROMPT_SESSION_KEY)).toBe('1');
    });

    it('extensao disponivel sem abas: mostra mensagem de nenhuma aba encontrada', async () => {
      isAvailable.mockResolvedValue(true);
      getOpenTabs.mockResolvedValue([]);

      const component = await createComponent();

      expect(component.showTabPicker()).toBe(true);
      expect(component.openTabs()).toEqual([]);
      expect(component.tabPickerError()).toBe(
        'Nenhuma outra aba http/https foi encontrada neste navegador.',
      );
    });

    it('extensao indisponivel: mostra o hint e nao chama getOpenTabs', async () => {
      isAvailable.mockResolvedValue(false);

      const component = await createComponent();

      expect(component.extensionAvailable()).toBe(false);
      expect(component.showExtensionHint()).toBe(true);
      expect(component.showTabPicker()).toBe(false);
      expect(getOpenTabs).not.toHaveBeenCalled();
    });

    it('ja perguntado nesta sessao: nao repete o prompt automatico, mas askForOpenTab manual funciona', async () => {
      sessionStorage.setItem(TAB_PROMPT_SESSION_KEY, '1');
      isAvailable.mockResolvedValue(true);
      getOpenTabs.mockResolvedValue([tab(1, 'Pagina A', 'https://a.com')]);

      const component = await createComponent();

      expect(component.extensionAvailable()).toBe(true);
      expect(component.showTabPicker()).toBe(false);
      expect(getOpenTabs).not.toHaveBeenCalled();

      await component.askForOpenTab();

      expect(getOpenTabs).toHaveBeenCalledTimes(1);
      expect(component.showTabPicker()).toBe(true);
      expect(component.openTabs()).toEqual([tab(1, 'Pagina A', 'https://a.com')]);
    });

    it('askForOpenTab seta tabPickerError quando a leitura das abas falha', async () => {
      sessionStorage.setItem(TAB_PROMPT_SESSION_KEY, '1');
      isAvailable.mockResolvedValue(true);
      const component = await createComponent();
      getOpenTabs.mockRejectedValue(new Error('falhou'));

      await component.askForOpenTab();

      expect(component.tabPickerError()).toBe('Nao foi possivel ler as abas abertas.');
      expect(component.isLoadingTabs()).toBe(false);
    });
  });

  describe('selectOpenTab', () => {
    it('resolve o titulo, cria/abre a referencia e fecha o tab picker', async () => {
      const component = await createComponent();
      component.showTabPicker.set(true);
      resolveTitle.mockResolvedValue('Titulo da aba');
      const theTab = tab(3, 'Aba', 'https://c.com');

      await component.selectOpenTab(theTab);

      expect(resolveTitle).toHaveBeenCalledWith('https://c.com', 'Aba');
      expect(createOrOpen).toHaveBeenCalledWith('https://c.com', 'Titulo da aba');
      expect(component.showTabPicker()).toBe(false);
      expect(component.isCreatingFromTab()).toBe(false);
    });

    it('erro seta tabPickerError', async () => {
      const component = await createComponent();
      createOrOpen.mockRejectedValue(
        new HttpErrorResponse({ status: 400, error: { detail: 'Nao deu certo.' } }),
      );

      await component.selectOpenTab(tab(3, 'Aba', 'https://c.com'));

      expect(component.tabPickerError()).toBe('Nao deu certo.');
      expect(component.isCreatingFromTab()).toBe(false);
    });

    it('chamada concorrente e ignorada enquanto isCreatingFromTab() e true', async () => {
      const component = await createComponent();
      let releaseResolveTitle!: (value: string) => void;
      resolveTitle.mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            releaseResolveTitle = resolve;
          }),
      );

      const theTab = tab(3, 'Aba', 'https://c.com');
      const firstCall = component.selectOpenTab(theTab);
      expect(component.isCreatingFromTab()).toBe(true);

      await component.selectOpenTab(theTab);
      expect(resolveTitle).toHaveBeenCalledTimes(1);
      expect(createOrOpen).not.toHaveBeenCalled();

      releaseResolveTitle('Titulo da aba');
      await firstCall;

      expect(createOrOpen).toHaveBeenCalledTimes(1);
      expect(component.isCreatingFromTab()).toBe(false);
    });
  });
});
