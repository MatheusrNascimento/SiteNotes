const MENTION_TITLE_LIMIT = 18;

export function abbreviateMentionTitle(title: string): string {
  if (title.length <= MENTION_TITLE_LIMIT) {
    return title;
  }

  return `${title.slice(0, MENTION_TITLE_LIMIT)}(...)`;
}

export function mentionToken(title: string, id: string): string {
  const safeTitle = title.replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim() || 'Referencia';
  return `@[${safeTitle}](ref:${id})`;
}
