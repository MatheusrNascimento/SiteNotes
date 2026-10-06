import { TestBed } from '@angular/core/testing';
import { ReferenceCreator } from '../../core/services/reference-creator.service';
import { AddReferenceForm, NewReferenceDraft } from './add-reference-form';

const TITLE_LOOKUP_DEBOUNCE_MS = 450;

describe('AddReferenceForm', () => {
  let resolveTitle: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resolveTitle = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AddReferenceForm],
      providers: [{ provide: ReferenceCreator, useValue: { resolveTitle } }],
    }).compileComponents();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createComponent(): AddReferenceForm {
    return TestBed.createComponent(AddReferenceForm).componentInstance;
  }

  it('so dispara a busca de titulo depois do debounce de 450ms', async () => {
    resolveTitle.mockResolvedValue('Titulo encontrado');
    const component = createComponent();

    component.onUrlChange('https://example.com');
    expect(resolveTitle).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(TITLE_LOOKUP_DEBOUNCE_MS - 1);
    expect(resolveTitle).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(resolveTitle).toHaveBeenCalledWith('https://example.com', '');
  });

  it('descarta o titulo de uma busca antiga quando a url ja mudou (correcao da corrida)', async () => {
    let resolveA!: (title: string) => void;
    const pendingA = new Promise<string>((resolve) => {
      resolveA = resolve;
    });
    resolveTitle.mockImplementationOnce(() => pendingA);
    resolveTitle.mockImplementationOnce(() => Promise.resolve('Titulo B'));

    const component = createComponent();

    component.onUrlChange('https://a.com');
    await vi.advanceTimersByTimeAsync(TITLE_LOOKUP_DEBOUNCE_MS);
    expect(resolveTitle).toHaveBeenCalledTimes(1);
    expect(component.title()).toBe('');

    component.onUrlChange('https://b.com');
    await vi.advanceTimersByTimeAsync(TITLE_LOOKUP_DEBOUNCE_MS);
    expect(resolveTitle).toHaveBeenCalledTimes(2);
    expect(component.title()).toBe('Titulo B');

    resolveA('Titulo A');
    await vi.advanceTimersByTimeAsync(0);

    expect(component.title()).toBe('Titulo B');
  });

  it('submit nao emite quando a url esta vazia ou so com espacos', () => {
    const component = createComponent();
    const emitted: NewReferenceDraft[] = [];
    component.submitted.subscribe((draft) => emitted.push(draft));

    component.url.set('   ');
    component.submit();

    expect(emitted).toEqual([]);
  });

  it('submit emite url, title e tags parseadas', () => {
    const component = createComponent();
    const emitted: NewReferenceDraft[] = [];
    component.submitted.subscribe((draft) => emitted.push(draft));

    component.url.set('  https://example.com  ');
    component.title.set('  Titulo  ');
    component.tags.set('a, b ,, c');
    component.submit();

    expect(emitted).toEqual([
      { url: 'https://example.com', title: 'Titulo', tags: ['a', 'b', 'c'] },
    ]);
  });
});
