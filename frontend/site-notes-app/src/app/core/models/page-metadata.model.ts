import { PageTitleSource } from '@sitenotes/shared/bridge-protocol';

export interface PageMetadata {
  url: string;
  title: string;
  source: PageTitleSource;
}
