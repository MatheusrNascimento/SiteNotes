import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { Note } from '../../core/models/note.model';
import { Reference } from '../../core/models/reference.model';
import { ReferenceDetail, parseReferenceId } from './reference-detail';

const reference: Reference = {
  id: 1,
  url: 'https://example.com',
  title: 'Exemplo',
  tags: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function note(id: number, content: string, createdAt: string): Note {
  return { id, referenceId: 1, content, createdAt, updatedAt: createdAt };
}

describe('ReferenceDetail', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'references/:id', component: ReferenceDetail }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.verify();
  });

  async function open(id: string): Promise<ReferenceDetail> {
    return harness.navigateByUrl(`/references/${id}`, ReferenceDetail);
  }

  function flushLoad(notes: Note[] = []): void {
    http.expectOne(`${API_BASE_URL}/references/1`).flush(reference);
    http.expectOne(`${API_BASE_URL}/references/1/notes`).flush(notes);
  }

  it('carrega referencia e notas juntas e so entao encerra o loading', async () => {
    const detail = await open('1');

    expect(detail.isLoading()).toBe(true);
    http.expectOne(`${API_BASE_URL}/references/1`).flush(reference);
    expect(detail.isLoading()).toBe(true);
    http
      .expectOne(`${API_BASE_URL}/references/1/notes`)
      .flush([note(1, 'a', '2026-01-01T00:00:00Z')]);

    expect(detail.isLoading()).toBe(false);
    expect(detail.reference()).toEqual(reference);
    expect(detail.notes().map((item) => item.id)).toEqual([1]);
  });

  it('mostra nao encontrada sem chamar a API quando o id da rota e invalido', async () => {
    for (const id of ['abc', '0', '-3', '1.5']) {
      const detail = await open(id);

      expect(detail.errorMessage()).toBe('Referencia nao encontrada.');
      expect(detail.isLoading()).toBe(false);
    }
  });

  it('recarrega quando o id da rota muda', async () => {
    const detail = await open('1');
    flushLoad();

    const same = await open('2');
    const other = { ...reference, id: 2, title: 'Outra' };
    http.expectOne(`${API_BASE_URL}/references/2`).flush(other);
    http.expectOne(`${API_BASE_URL}/references/2/notes`).flush([]);

    expect(same).toBe(detail);
    expect(detail.reference()?.title).toBe('Outra');
  });

  it('mostra a mensagem de regra de negocio devolvida pela API', async () => {
    const detail = await open('1');
    flushLoad();

    detail.startComposeNewNote();
    detail.newNoteContent.set(
      JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
      }),
    );
    detail.addNote();
    http
      .expectOne(`${API_BASE_URL}/references/1/notes`)
      .flush(
        { title: 'Regra de negocio violada.', detail: 'Conteudo da anotacao nao pode ser vazio.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(detail.errorMessage()).toBe('Conteudo da anotacao nao pode ser vazio.');
    expect(detail.newNoteContent()).toContain('"text":"x"');
    expect(detail.isComposingNewNote()).toBe(true);
  });

  it('edita titulo, url e tags pelo formulario do cabecalho', async () => {
    const detail = await open('1');
    flushLoad();
    const element: HTMLElement = harness.routeNativeElement!;

    detail.isEditingReference.set(true);
    harness.detectChanges();
    await harness.fixture.whenStable();
    const title = element.querySelector<HTMLInputElement>('#edit-reference-title')!;
    const tags = element.querySelector<HTMLInputElement>('#edit-reference-tags')!;
    expect(title.value).toBe('Exemplo');

    title.value = 'Novo titulo';
    title.dispatchEvent(new Event('input'));
    tags.value = 'a, b ,';
    tags.dispatchEvent(new Event('input'));
    element.querySelector<HTMLFormElement>('.edit-form')!.dispatchEvent(new Event('submit'));

    const put = http.expectOne(`${API_BASE_URL}/references/1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      url: reference.url,
      title: 'Novo titulo',
      tags: ['a', 'b'],
    });
    put.flush({ ...reference, title: 'Novo titulo', tags: ['a', 'b'] });

    expect(detail.reference()?.title).toBe('Novo titulo');
    expect(detail.isEditingReference()).toBe(false);
  });

  it('valida o id da rota', () => {
    expect(parseReferenceId('42')).toBe(42);
    expect(parseReferenceId(null)).toBeNull();
    expect(parseReferenceId('1e3')).toBeNull();
    expect(parseReferenceId(' 7')).toBeNull();
  });

  it('adiciona, edita e exclui notas sem recarregar a tela', async () => {
    const detail = await open('1');
    flushLoad([note(1, 'primeira', '2026-01-01T00:00:00Z')]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const second = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'segunda' }] }],
    });
    detail.startComposeNewNote();
    detail.newNoteContent.set(second);
    detail.addNote();
    http.expectOne(`${API_BASE_URL}/references/1/notes`).flush(note(2, second, '2026-01-02T00:00:00Z'));
    expect(detail.notes().map((item) => item.content)).toEqual([second, 'primeira']);
    expect(detail.newNoteContent()).toBe('');
    expect(detail.isComposingNewNote()).toBe(false);

    detail.startEdit(detail.notes()[1]);
    detail.editingContent.set('editada');
    detail.saveEdit();
    http.expectOne(`${API_BASE_URL}/notes/1`).flush(note(1, 'editada', '2026-01-01T00:00:00Z'));
    expect(detail.notes().map((item) => item.content)).toEqual([second, 'editada']);
    expect(detail.editingNoteId()).toBeNull();

    detail.deleteNote(2);
    http.expectOne(`${API_BASE_URL}/notes/2`).flush(null);
    expect(detail.notes().map((item) => item.id)).toEqual([1]);
  });

  it('ignora envio de documento TipTap vazio', async () => {
    const detail = await open('1');
    flushLoad();

    detail.newNoteContent.set('{"type":"doc","content":[{"type":"paragraph"}]}');
    detail.addNote();
    http.expectNone(`${API_BASE_URL}/references/1/notes`);
  });
});
