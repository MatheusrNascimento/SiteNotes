import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Reference } from '../models/reference.model';
import { ReferencesService } from './references.service';

const reference: Reference = {
  id: 1,
  url: 'https://example.com',
  title: 'Exemplo',
  tags: ['a'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ReferencesService', () => {
  let service: ReferencesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReferencesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lista sem parametros quando os filtros estao vazios', async () => {
    const result = firstValueFrom(service.getAll('', undefined));

    http.expectOne(`${API_BASE_URL}/references`).flush([reference]);

    await expect(result).resolves.toEqual([reference]);
  });

  it('envia search e tag como query string', () => {
    service.getAll('exem', 'a').subscribe();

    const request = http.expectOne((req) => req.url === `${API_BASE_URL}/references`);
    expect(request.request.params.get('search')).toBe('exem');
    expect(request.request.params.get('tag')).toBe('a');
    request.flush([]);
  });

  it('cria com POST e exclui com DELETE', async () => {
    const created = firstValueFrom(
      service.create({ url: reference.url, title: reference.title, tags: reference.tags }),
    );
    const post = http.expectOne(`${API_BASE_URL}/references`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ url: reference.url, title: 'Exemplo', tags: ['a'] });
    post.flush(reference);
    await expect(created).resolves.toEqual(reference);

    service.delete(1).subscribe();
    const remove = http.expectOne(`${API_BASE_URL}/references/1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('adiciona nota no endpoint aninhado da referencia', () => {
    service.addNote(1, 'ideia').subscribe();

    const request = http.expectOne(`${API_BASE_URL}/references/1/notes`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ content: 'ideia' });
    request.flush({});
  });
});
