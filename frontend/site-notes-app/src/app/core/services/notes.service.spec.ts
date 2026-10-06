import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Note } from '../models/note.model';
import { NotesService } from './notes.service';

const note: Note = {
  id: 1,
  referenceId: 1,
  content: 'anotacao',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('NotesService', () => {
  let service: NotesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('update envia PUT com o conteudo no corpo', async () => {
    const result = firstValueFrom(service.update(1, 'novo conteudo'));

    const request = http.expectOne(`${API_BASE_URL}/notes/1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ content: 'novo conteudo' });
    request.flush(note);

    await expect(result).resolves.toEqual(note);
  });

  it('delete envia DELETE para o id da nota', async () => {
    const result = firstValueFrom(service.delete(1));

    const request = http.expectOne(`${API_BASE_URL}/notes/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    await expect(result).resolves.toBeNull();
  });
});
