import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EMPTY,
  Observable,
  catchError,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  switchMap,
  tap,
} from 'rxjs';
import { Note } from '../../core/models/note.model';
import { Reference } from '../../core/models/reference.model';
import { NotesService } from '../../core/services/notes.service';
import { ReferencesService } from '../../core/services/references.service';
import { SortDirection, SortToggle } from '../../shared/ui/sort-toggle/sort-toggle';
import { TagList } from '../../shared/ui/tag-list/tag-list';

const NOT_FOUND_MESSAGE = 'Referencia nao encontrada.';

/** Ids da API sao inteiros positivos; qualquer outra coisa na rota e tratada como inexistente. */
export function parseReferenceId(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }

  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

@Component({
  selector: 'app-reference-detail',
  imports: [FormsModule, RouterLink, DatePipe, SortToggle, TagList],
  templateUrl: './reference-detail.html',
  styleUrl: './reference-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferenceDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly referencesService = inject(ReferencesService);
  private readonly notesService = inject(NotesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly reference = signal<Reference | null>(null);
  readonly notes = signal<Note[]>([]);
  readonly sortDirection = signal<SortDirection>('desc');
  readonly sortedNotes = computed(() => {
    const direction = this.sortDirection();
    return [...this.notes()].sort((left, right) => {
      const delta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return direction === 'asc' ? delta : -delta;
    });
  });
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly newNoteContent = signal('');
  readonly editingNoteId = signal<number | null>(null);
  readonly editingContent = signal('');

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => parseReferenceId(params.get('id'))),
        distinctUntilChanged(),
        switchMap((id) => this.load(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private load(id: number | null): Observable<unknown> {
    this.reference.set(null);
    this.notes.set([]);
    this.cancelEdit();
    this.errorMessage.set(null);

    if (id === null) {
      this.errorMessage.set(NOT_FOUND_MESSAGE);
      return EMPTY;
    }

    this.isLoading.set(true);
    return forkJoin({
      reference: this.referencesService.getById(id),
      notes: this.referencesService.getNotes(id),
    }).pipe(
      tap(({ reference, notes }) => {
        this.reference.set(reference);
        this.notes.set(notes);
      }),
      catchError(() => {
        this.errorMessage.set(NOT_FOUND_MESSAGE);
        return EMPTY;
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  addNote(): void {
    const reference = this.reference();
    const content = this.newNoteContent().trim();
    if (!reference || !content) {
      return;
    }

    this.referencesService
      .addNote(reference.id, content)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (note) => {
          this.newNoteContent.set('');
          this.notes.update((notes) => [note, ...notes]);
        },
        error: () => this.errorMessage.set('Nao foi possivel adicionar a anotacao.'),
      });
  }

  startEdit(note: Note): void {
    this.editingNoteId.set(note.id);
    this.editingContent.set(note.content);
  }

  cancelEdit(): void {
    this.editingNoteId.set(null);
    this.editingContent.set('');
  }

  saveEdit(): void {
    const noteId = this.editingNoteId();
    if (noteId === null) {
      return;
    }

    const content = this.editingContent().trim();
    if (!content) {
      return;
    }

    this.notesService
      .update(noteId, content)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.cancelEdit();
          this.notes.update((notes) =>
            notes.map((note) => (note.id === updated.id ? updated : note)),
          );
        },
        error: () => this.errorMessage.set('Nao foi possivel salvar a anotacao.'),
      });
  }

  deleteNote(id: number): void {
    if (!confirm('Excluir esta anotacao?')) {
      return;
    }

    this.notesService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.notes.update((notes) => notes.filter((note) => note.id !== id)),
        error: () => this.errorMessage.set('Nao foi possivel excluir a anotacao.'),
      });
  }

  deleteReference(): void {
    const reference = this.reference();
    if (!reference || !confirm('Excluir esta referencia e todas as suas anotacoes?')) {
      return;
    }

    this.referencesService
      .delete(reference.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/references']),
        error: () => this.errorMessage.set('Nao foi possivel excluir a referencia.'),
      });
  }
}
