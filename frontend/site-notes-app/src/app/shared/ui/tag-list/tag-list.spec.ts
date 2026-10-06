import { TestBed } from '@angular/core/testing';
import { TagList } from './tag-list';

describe('TagList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TagList] }).compileComponents();
  });

  it('renderiza um span.tag por tag recebida', () => {
    const fixture = TestBed.createComponent(TagList);
    fixture.componentRef.setInput('tags', ['angular', 'vitest', 'ddd']);
    fixture.detectChanges();

    const spans: NodeListOf<HTMLSpanElement> = fixture.nativeElement.querySelectorAll('span.tag');

    expect(spans.length).toBe(3);
    expect(Array.from(spans).map((span) => span.textContent?.trim())).toEqual([
      'angular',
      'vitest',
      'ddd',
    ]);
  });

  it('nao renderiza nenhum span quando a lista de tags esta vazia', () => {
    const fixture = TestBed.createComponent(TagList);
    fixture.componentRef.setInput('tags', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('span.tag').length).toBe(0);
  });
});
