import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { PageMetadata } from '../models/page-metadata.model';

@Injectable({ providedIn: 'root' })
export class PageMetadataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/page-metadata`;

  get(url: string): Observable<PageMetadata | null> {
    const params = new HttpParams().set('url', url);
    return this.http.get<PageMetadata>(this.baseUrl, { params }).pipe(catchError(() => of(null)));
  }
}
