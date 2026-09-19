import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Note } from '../../core/models/note.model';
import { Reference } from '../../core/models/reference.model';
import { NotesService } from '../../core/services/notes.service';
import { ReferencesService } from '../../core/services/references.service';

@Component({
  selector: 'app-reference-detail',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './reference-detail.html',
  styleUrl: './reference-detail.css',
})
export class ReferenceDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly referencesService = inject(ReferencesService);
  private readonly notesService = inject(NotesService);

  private readonly referenceId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly reference = signal<Reference | null>(null);
  readonly notes = signal<Note[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  newNoteContent = '';
  editingNoteId: string | null = null;
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

    this.referencesService.getById(this.referenceId).subscribe({
      next: (ref) => this.reference.set(ref),
      error: () => this.errorMessage.set('Referencia nao encontrada.'),
    });

    this.referencesService.getNotes(this.referenceId).subscribe({
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

    this.referencesService.addNote(this.referenceId, content).subscribe({
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
    if (!this.editingNoteId) {
      return;
    }

    const content = this.editingContent.trim();
    if (!content) {
      return;
    }

    this.notesService.update(this.editingNoteId, content).subscribe({
      next: () => {
        this.cancelEdit();
        this.load();
      },
      error: () => this.errorMessage.set('Nao foi possivel salvar a anotacao.'),
    });
  }

  deleteNote(id: string): void {
    if (!confirm('Excluir esta anotacao?')) {
      return;
    }

    this.notesService.delete(id).subscribe({
      next: () => this.load(),
      error: () => this.errorMessage.set('Nao foi possivel excluir a anotacao.'),
    });
  }

  deleteReference(): void {
    if (!confirm('Excluir esta referencia e todas as suas anotacoes?')) {
      return;
    }

    this.referencesService.delete(this.referenceId).subscribe({
      next: () => this.router.navigate(['/references']),
      error: () => this.errorMessage.set('Nao foi possivel excluir a referencia.'),
    });
  }
}
