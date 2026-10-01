import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../config/api.config';
import { Reference } from '../models/reference.model';
import { ReferenceCreator } from './reference-creator.service';

const existing: Reference = {
  id: 7,
  url: 'https://www.example.com/post/',
  title: 'Post',
  tags: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ReferenceCreator', () => {
  let creator: ReferenceCreator;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    creator = TestBed.inject(ReferenceCreator);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
  });

  function expectDuplicateSearch(term: string) {
    return http.expectOne(
      (req) =>
        req.method === 'GET' &&
        req.url === `${API_BASE_URL}/references` &&
        req.params.get('search') === term,
    );
  }

  it('busca so os candidatos pelo host e abre a referencia com a mesma URL canonica', async () => {
    const done = creator.createOrOpen('https://example.com/post?utm_source=x', 'Post');

    expectDuplicateSearch('example.com').flush([existing]);
    await done;

    expect(navigate).toHaveBeenCalledWith(['/references', 7]);
  });

  it('cria quando nenhum candidato tem a mesma URL canonica', async () => {
    const done = creator.createOrOpen('https://example.com/outro', 'Outro', ['a']);

    expectDuplicateSearch('example.com').flush([existing]);
    const post = await vi.waitFor(() => http.expectOne((req) => req.method === 'POST'));
    expect(post.request.body).toEqual({
      url: 'https://example.com/outro',
      title: 'Outro',
      tags: ['a'],
    });
    post.flush({ ...existing, id: 8 });
    await done;

    expect(navigate).toHaveBeenCalledWith(['/references', 8]);
  });
});
