import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

  newNoteContent = '';
  editingNoteId: number | null = null;
  editingContent = '';

  constructor() {
    this.load();
  }

  load(): void {
    if (!this.referenceId) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.referencesService
      .getById(this.referenceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ref) => this.reference.set(ref),
        error: () => this.errorMessage.set('Referencia nao encontrada.'),
      });

    this.referencesService
      .getNotes(this.referenceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notes) => {
          this.notes.set(notes);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar as anotacoes.');
          this.isLoading.set(false);
        },
      });
  }

  addNote(): void {
    const content = this.newNoteContent.trim();
    if (!content) {
      return;
    }

    this.referencesService
      .addNote(this.referenceId, content)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.newNoteContent = '';
          this.load();
        },
        error: () => this.errorMessage.set('Nao foi possivel adicionar a anotacao.'),
      });
  }

  startEdit(note: Note): void {
    this.editingNoteId = note.id;
    this.editingContent = note.content;
  }

  cancelEdit(): void {
    this.editingNoteId = null;
    this.editingContent = '';
  }

  saveEdit(): void {
    if (this.editingNoteId === null) {
      return;
    }

    const content = this.editingContent.trim();
    if (!content) {
      return;
    }

    this.notesService
      .update(this.editingNoteId, content)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.load();
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
        next: () => this.load(),
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
