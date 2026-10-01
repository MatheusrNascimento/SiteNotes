import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Note } from '../models/note.model';
import {
  CreateReferenceRequest,
  Reference,
  UpdateReferenceRequest,
} from '../models/reference.model';

@Injectable({ providedIn: 'root' })
export class ReferencesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/references`;

  getAll(search?: string, tag?: string): Observable<Reference[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    if (tag) {
      params = params.set('tag', tag);
    }

    return this.http.get<Reference[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Reference> {
    return this.http.get<Reference>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateReferenceRequest): Observable<Reference> {
    return this.http.post<Reference>(this.baseUrl, request);
  }

  update(id: number, request: UpdateReferenceRequest): Observable<Reference> {
    return this.http.put<Reference>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getNotes(id: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.baseUrl}/${id}/notes`);
  }

  addNote(id: number, content: string): Observable<Note> {
    return this.http.post<Note>(`${this.baseUrl}/${id}/notes`, { content });
  }
}
