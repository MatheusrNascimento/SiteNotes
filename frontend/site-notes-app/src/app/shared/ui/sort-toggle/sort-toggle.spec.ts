import { TestBed } from '@angular/core/testing';
import { SortToggle } from './sort-toggle';

describe('SortToggle', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SortToggle] }).compileComponents();
  });

  function createFixture(direction: 'asc' | 'desc' = 'desc') {
    const fixture = TestBed.createComponent(SortToggle);
    fixture.componentRef.setInput('direction', direction);
    fixture.componentRef.setInput('label', 'Ordenar por data');
    fixture.detectChanges();
    return fixture;
  }

  it('aria-pressed reflete a direcao atual', () => {
    const fixture = createFixture('desc');
    const buttons = fixture.nativeElement.querySelectorAll('button');

    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('clicar em "Mais antigos" atualiza o model para asc e emite a mudanca', () => {
    const fixture = createFixture('desc');
    const changes: string[] = [];
    fixture.componentInstance.direction.subscribe((value) => changes.push(value));

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.direction()).toBe('asc');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(changes).toEqual(['asc']);
  });

  it('clicar em "Mais recentes" atualiza o model para desc', () => {
    const fixture = createFixture('asc');

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.direction()).toBe('desc');
  });
});
