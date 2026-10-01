import { Injectable, inject } from '@angular/core';
import { PageMetadata } from '../models/page-metadata.model';
import { hostTitleFromUrl, isBlockedLookupHost } from '../utils/url.util';
import { BrowserTabsService } from './browser-tabs.service';

/** Espera curta: sem extensao, o titulo cai no host e o formulario nao deve travar. */
const EXTENSION_CHECK_TIMEOUT_MS = 800;

@Injectable({ providedIn: 'root' })
export class PageMetadataService {
  private readonly browserTabs = inject(BrowserTabsService);

  async get(url: string): Promise<PageMetadata> {
    const trimmed = url.trim();
    if (!trimmed) {
      return { url: '', title: '', source: 'fallback' };
    }

    if (isBlockedLookupHost(trimmed)) {
      return {
        url: trimmed,
        title: hostTitleFromUrl(trimmed),
        source: 'blocked-host',
      };
    }

    try {
      if (await this.browserTabs.isAvailable(EXTENSION_CHECK_TIMEOUT_MS)) {
        return await this.browserTabs.resolvePageTitle(trimmed);
      }
    } catch {
      // fallback abaixo
    }

    return {
      url: trimmed,
      title: hostTitleFromUrl(trimmed),
      source: 'fallback',
    };
  }
}
