import { formatTags, parseTags } from './tags.util';

describe('parseTags', () => {
  it('separa por virgula, tira espacos e remove vazios', () => {
    expect(parseTags('a, b ,  c ,, , d')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('devolve lista vazia para texto vazio ou so com virgulas/espacos', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags('   ')).toEqual([]);
    expect(parseTags(' , , ')).toEqual([]);
  });
});

describe('formatTags', () => {
  it('junta as tags com virgula e espaco', () => {
    expect(formatTags(['a', 'b', 'c'])).toBe('a, b, c');
  });

  it('devolve texto vazio para lista vazia', () => {
    expect(formatTags([])).toBe('');
  });
});

describe('round-trip parseTags/formatTags', () => {
  it('formatTags(parseTags(texto)) normaliza espacos e vazios', () => {
    const texto = ' a ,b,  , c ';
    expect(formatTags(parseTags(texto))).toBe('a, b, c');
  });

  it('parseTags(formatTags(tags)) preserva as tags originais', () => {
    const tags = ['a', 'b', 'c'];
    expect(parseTags(formatTags(tags))).toEqual(tags);
  });
});
