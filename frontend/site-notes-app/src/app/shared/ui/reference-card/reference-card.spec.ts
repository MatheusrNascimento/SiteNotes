import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Reference } from '../../../core/models/reference.model';
import { hostTitleFromUrl } from '../../../core/utils/url.util';
import { ReferenceCard } from './reference-card';

const reference: Reference = {
  id: 7,
  url: 'https://www.example.com/post',
  title: 'Exemplo',
  tags: ['a', 'b'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('ReferenceCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferenceCard],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function createFixture() {
    const fixture = TestBed.createComponent(ReferenceCard);
    fixture.componentRef.setInput('reference', reference);
    fixture.detectChanges();
    return fixture;
  }

  it('calcula host a partir da url via hostTitleFromUrl', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.host()).toBe(hostTitleFromUrl(reference.url));
  });

  it('requestDelete bloqueia o evento e emite deleteRequested com o id da referencia', () => {
    const fixture = createFixture();
    const emitted: number[] = [];
    fixture.componentInstance.deleteRequested.subscribe((id) => emitted.push(id));

    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as Event;
    fixture.componentInstance.requestDelete(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(emitted).toEqual([7]);
  });
});
