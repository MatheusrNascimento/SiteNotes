import { TestBed } from '@angular/core/testing';
import { OpenTab } from '../../core/models/open-tab.model';
import { TabPicker } from './tab-picker';

function tab(overrides: Partial<OpenTab> = {}): OpenTab {
  return {
    id: 1,
    windowId: 1,
    title: 'Pagina A',
    url: 'https://a.com',
    favIconUrl: '',
    active: false,
    ...overrides,
  };
}

describe('TabPicker', () => {
  let showModal: ReturnType<typeof vi.fn>;
  let originalShowModal: typeof HTMLDialogElement.prototype.showModal;

  beforeEach(async () => {
    // jsdom nao implementa showModal(); sem o stub o afterNextRender do componente lancaria.
    originalShowModal = HTMLDialogElement.prototype.showModal;
    showModal = vi.fn();
    HTMLDialogElement.prototype.showModal = showModal as unknown as () => void;

    await TestBed.configureTestingModule({ imports: [TabPicker] }).compileComponents();
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = originalShowModal;
  });

  function createFixture(tabs: OpenTab[]) {
    const fixture = TestBed.createComponent(TabPicker);
    fixture.componentRef.setInput('tabs', tabs);
    fixture.detectChanges();
    return fixture;
  }

  it('chama showModal no dialog apos o proximo render', async () => {
    createFixture([tab()]);

    await vi.waitFor(() => expect(showModal).toHaveBeenCalled());
  });

  it('filteredTabs filtra por titulo ou url a partir do signal search, sem diferenciar caixa', () => {
    const tabs = [
      tab({ id: 1, title: 'Documentacao Angular', url: 'https://angular.dev' }),
      tab({ id: 2, title: 'Outra pagina', url: 'https://example.com' }),
    ];
    const fixture = createFixture(tabs);
    const component = fixture.componentInstance;

    expect(component.filteredTabs().map((t) => t.id)).toEqual([1, 2]);

    component.search.set('ANGULAR');
    expect(component.filteredTabs().map((t) => t.id)).toEqual([1]);

    component.search.set('example.com');
    expect(component.filteredTabs().map((t) => t.id)).toEqual([2]);

    component.search.set('   ');
    expect(component.filteredTabs().map((t) => t.id)).toEqual([1, 2]);
  });

  it('onBackdropClick e onCancel chamam dismiss() quando nao esta criando', () => {
    const fixture = createFixture([tab()]);
    const component = fixture.componentInstance;
    const dismissed = vi.fn();
    component.dismissed.subscribe(dismissed);

    const dialogElement = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    component.onBackdropClick({ target: dialogElement } as unknown as MouseEvent);
    expect(dismissed).toHaveBeenCalledTimes(1);

    const cancelEvent = { preventDefault: vi.fn() } as unknown as Event;
    component.onCancel(cancelEvent);
    expect(cancelEvent.preventDefault).toHaveBeenCalled();
    expect(dismissed).toHaveBeenCalledTimes(2);
  });

  it('onBackdropClick ignora cliques que nao sejam no proprio <dialog> (ex.: dentro do modal-body)', () => {
    const fixture = createFixture([tab()]);
    const component = fixture.componentInstance;
    const dismissed = vi.fn();
    component.dismissed.subscribe(dismissed);

    component.onBackdropClick({ target: document.createElement('div') } as unknown as MouseEvent);

    expect(dismissed).not.toHaveBeenCalled();
  });

  it('onBackdropClick/onCancel nao emitem dismissed quando creating() e true', () => {
    const fixture = createFixture([tab()]);
    fixture.componentRef.setInput('creating', true);
    const component = fixture.componentInstance;
    const dismissed = vi.fn();
    component.dismissed.subscribe(dismissed);

    const dialogElement = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    component.onBackdropClick({ target: dialogElement } as unknown as MouseEvent);
    component.onCancel({ preventDefault: vi.fn() } as unknown as Event);

    expect(dismissed).not.toHaveBeenCalled();
  });
});
