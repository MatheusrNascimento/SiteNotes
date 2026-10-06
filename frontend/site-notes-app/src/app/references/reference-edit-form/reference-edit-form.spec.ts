import { TestBed } from '@angular/core/testing';
import { Reference, UpdateReferenceRequest } from '../../core/models/reference.model';
import { ReferenceEditForm } from './reference-edit-form';

const referenceA: Reference = {
  id: 1,
  url: 'https://a.com',
  title: 'Titulo A',
  tags: ['x'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const referenceB: Reference = {
  id: 2,
  url: 'https://b.com',
  title: 'Titulo B',
  tags: ['y', 'z'],
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('ReferenceEditForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReferenceEditForm] }).compileComponents();
  });

  function createFixture(reference: Reference) {
    const fixture = TestBed.createComponent(ReferenceEditForm);
    fixture.componentRef.setInput('reference', reference);
    fixture.detectChanges();
    return fixture;
  }

  it('inicializa url/title/tags a partir da referencia recebida', () => {
    const fixture = createFixture(referenceA);
    const component = fixture.componentInstance;

    expect(component.url()).toBe('https://a.com');
    expect(component.title()).toBe('Titulo A');
    expect(component.tags()).toBe('x');
  });

  it('linkedSignal reage a troca do input reference e descarta edicoes manuais anteriores', () => {
    const fixture = createFixture(referenceA);
    const component = fixture.componentInstance;

    component.url.set('url editada manualmente');
    component.title.set('titulo editado manualmente');
    component.tags.set('tag-manual');
    expect(component.url()).toBe('url editada manualmente');

    fixture.componentRef.setInput('reference', referenceB);
    fixture.detectChanges();

    expect(component.url()).toBe('https://b.com');
    expect(component.title()).toBe('Titulo B');
    expect(component.tags()).toBe('y, z');
  });

  it('submit nao emite quando a url esta vazia ou so com espacos', () => {
    const fixture = createFixture(referenceA);
    const component = fixture.componentInstance;
    const emitted: UpdateReferenceRequest[] = [];
    component.saved.subscribe((request) => emitted.push(request));

    component.url.set('   ');
    component.submit();

    expect(emitted).toEqual([]);
  });

  it('submit emite UpdateReferenceRequest com url/title aparados e tags parseadas', () => {
    const fixture = createFixture(referenceA);
    const component = fixture.componentInstance;
    const emitted: UpdateReferenceRequest[] = [];
    component.saved.subscribe((request) => emitted.push(request));

    component.url.set('  https://nova-url.com  ');
    component.title.set('  Novo titulo  ');
    component.tags.set('a, b ,, c');
    component.submit();

    expect(emitted).toEqual([
      { url: 'https://nova-url.com', title: 'Novo titulo', tags: ['a', 'b', 'c'] },
    ]);
  });
});
