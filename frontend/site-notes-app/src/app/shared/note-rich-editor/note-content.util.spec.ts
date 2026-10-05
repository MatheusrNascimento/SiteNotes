import { describe, expect, it } from 'vitest';
import {
  emptyDoc,
  extractPlainText,
  isHttpUrl,
  noteContentHasText,
  parseNoteContent,
  sanitizeHttpUrl,
  serializeNoteContent,
} from './note-content.util';

describe('note-content.util', () => {
  it('aceita apenas http e https', () => {
    expect(isHttpUrl('https://youtube.com/watch?v=123')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(sanitizeHttpUrl(' javascript:alert(1) ')).toBeNull();
    expect(sanitizeHttpUrl(' https://example.com/a ')).toBe('https://example.com/a');
  });

  it('converte texto legado em documento TipTap', () => {
    const doc = parseNoteContent('  patos na lagoa  ');
    expect(doc).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'patos na lagoa' }],
        },
      ],
    });
    expect(noteContentHasText('patos na lagoa')).toBe(true);
  });

  it('reconhece JSON TipTap e rejeita documento vazio', () => {
    const withLink = serializeNoteContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'patos na lagoa',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://youtube.com/watch?v=123', target: '_blank' },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(noteContentHasText(withLink)).toBe(true);
    expect(extractPlainText(parseNoteContent(withLink)).trim()).toBe('patos na lagoa');
    expect(noteContentHasText(serializeNoteContent(emptyDoc()))).toBe(false);
    expect(noteContentHasText('{"type":"doc","content":[{"type":"paragraph"}]}')).toBe(false);
  });

  it('trata JSON invalido que comeca com chave como texto legado', () => {
    const doc = parseNoteContent('{nao-e-json');
    expect(extractPlainText(doc).trim()).toBe('{nao-e-json');
  });
});
