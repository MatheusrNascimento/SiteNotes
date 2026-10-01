import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { Note } from '../../core/models/note.model';
import { Reference } from '../../core/models/reference.model';
import { ReferenceDetail } from './reference-detail';

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

  it('adiciona, edita e exclui notas sem recarregar a tela', async () => {
    const detail = await open('1');
    flushLoad([note(1, 'primeira', '2026-01-01T00:00:00Z')]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    detail.newNoteContent.set('segunda');
    detail.addNote();
    http
      .expectOne(`${API_BASE_URL}/references/1/notes`)
      .flush(note(2, 'segunda', '2026-01-02T00:00:00Z'));
    expect(detail.notes().map((item) => item.content)).toEqual(['segunda', 'primeira']);
    expect(detail.newNoteContent()).toBe('');

    detail.startEdit(detail.notes()[1]);
    detail.editingContent.set('editada');
    detail.saveEdit();
    http.expectOne(`${API_BASE_URL}/notes/1`).flush(note(1, 'editada', '2026-01-01T00:00:00Z'));
    expect(detail.notes().map((item) => item.content)).toEqual(['segunda', 'editada']);
    expect(detail.editingNoteId()).toBeNull();

    detail.deleteNote(2);
    http.expectOne(`${API_BASE_URL}/notes/2`).flush(null);
    expect(detail.notes().map((item) => item.id)).toEqual([1]);
  });
});
