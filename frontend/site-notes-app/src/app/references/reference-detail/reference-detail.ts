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
import { finalize, forkJoin } from 'rxjs';
import { Note } from '../../core/models/note.model';
import { Reference } from '../../core/models/reference.model';
import { NotesService } from '../../core/services/notes.service';
import { ReferencesService } from '../../core/services/references.service';
import { SortDirection, SortToggle } from '../../shared/ui/sort-toggle/sort-toggle';
import { TagList } from '../../shared/ui/tag-list/tag-list';

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

  private readonly referenceId = Number(this.route.snapshot.paramMap.get('id'));

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
    this.load();
  }

  load(): void {
    if (!this.referenceId) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      reference: this.referencesService.getById(this.referenceId),
      notes: this.referencesService.getNotes(this.referenceId),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ reference, notes }) => {
          this.reference.set(reference);
          this.notes.set(notes);
        },
        error: () => this.errorMessage.set('Referencia nao encontrada.'),
      });
  }

  addNote(): void {
    const content = this.newNoteContent().trim();
    if (!content) {
      return;
    }

    this.referencesService
      .addNote(this.referenceId, content)
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
    if (!confirm('Excluir esta referencia e todas as suas anotacoes?')) {
      return;
    }

    this.referencesService
      .delete(this.referenceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/references']),
        error: () => this.errorMessage.set('Nao foi possivel excluir a referencia.'),
      });
  }
}
