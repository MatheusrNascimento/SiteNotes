import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Reference } from '../models/reference.model';
import { canonicalReferenceUrl, cleanPageTitle } from '../utils/url.util';
import { PageMetadataService } from './page-metadata.service';
import { ReferencesService } from './references.service';

@Injectable({ providedIn: 'root' })
export class ReferenceCreator {
  private readonly referencesService = inject(ReferencesService);
  private readonly pageMetadata = inject(PageMetadataService);
  private readonly router = inject(Router);

  async resolveTitle(url: string, fallbackTitle: string): Promise<string> {
    const metadata = await this.pageMetadata.get(url);
    const fromPage = cleanPageTitle(metadata?.title ?? '');
    if (fromPage && metadata?.source !== 'fallback' && metadata?.source !== 'blocked-host') {
      return fromPage;
    }

    const fromTab = cleanPageTitle(fallbackTitle);
    if (fromTab) {
      return fromTab;
    }

    return fromPage || url;
  }

  /**
   * Abre a referencia que ja tem a mesma URL canonica ou cria uma nova, e navega para o detalhe.
   * Rejeita quando a criacao falha.
   */
  async createOrOpen(url: string, title: string, tags: string[] = []): Promise<void> {
    const target =
      (await this.findExisting(url)) ??
      (await firstValueFrom(this.referencesService.create({ url, title: title || url, tags })));

    await this.router.navigate(['/references', target.id]);
  }

  private async findExisting(url: string): Promise<Reference | undefined> {
    const canonical = canonicalReferenceUrl(url);

    try {
      const known = await firstValueFrom(this.referencesService.getAll());
      return known.find((reference) => canonicalReferenceUrl(reference.url) === canonical);
    } catch {
      return undefined;
    }
  }
}
