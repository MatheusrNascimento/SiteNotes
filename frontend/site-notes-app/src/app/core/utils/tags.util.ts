export function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function formatTags(tags: readonly string[]): string {
  return tags.join(', ');
}
