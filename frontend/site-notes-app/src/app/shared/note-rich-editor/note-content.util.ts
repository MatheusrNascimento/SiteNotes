import type { JSONContent } from '@tiptap/core';

export function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Aceita só http(s); devolve a URL trimada ou null. */
export function sanitizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!isHttpUrl(trimmed)) {
    return null;
  }

  return new URL(trimmed).toString();
}

export function isTipTapDoc(value: unknown): value is JSONContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as JSONContent).type === 'doc'
  );
}

export function parseNoteContent(raw: string): JSONContent {
  const trimmed = raw.trim();
  if (!trimmed) {
    return emptyDoc();
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isTipTapDoc(parsed)) {
        return parsed;
      }
    } catch {
      // texto legado que começa com `{`
    }
  }

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: trimmed ? [{ type: 'text', text: trimmed }] : undefined,
      },
    ],
  };
}

export function emptyDoc(): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  };
}

export function serializeNoteContent(doc: JSONContent): string {
  return JSON.stringify(doc);
}

export function noteContentHasText(raw: string): boolean {
  return extractPlainText(parseNoteContent(raw)).trim().length > 0;
}

export function extractPlainText(node: JSONContent): string {
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text;
  }

  if (!node.content?.length) {
    return node.type === 'paragraph' ? '\n' : '';
  }

  return node.content.map(extractPlainText).join('');
}
