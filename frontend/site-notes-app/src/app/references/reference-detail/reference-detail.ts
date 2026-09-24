import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Note, NoteBacklink } from '../../core/models/note.model';
import { Reference } from '../../core/models/reference.model';
import { NotesService } from '../../core/services/notes.service';
import { ReferencesService } from '../../core/services/references.service';
import { abbreviateMentionTitle, mentionToken } from '../../core/utils/mention.util';

type MentionTarget = 'new' | 'edit';

@Component({
  selector: 'app-reference-detail',
  imports: [FormsModule, RouterLink, DatePipe, NgTemplateOutlet],
  templateUrl: './reference-detail.html',
  styleUrl: './reference-detail.css',
})
export class ReferenceDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly referencesService = inject(ReferencesService);
  private readonly notesService = inject(NotesService);
  private readonly newNoteInput = viewChild<ElementRef<HTMLTextAreaElement>>('newNoteInput');
  private readonly editNoteInput = viewChild<ElementRef<HTMLTextAreaElement>>('editNoteInput');

  private referenceId = '';

  readonly reference = signal<Reference | null>(null);
  readonly notes = signal<Note[]>([]);
  readonly backlinks = signal<NoteBacklink[]>([]);
  readonly mentionResults = signal<Reference[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  newNoteContent = '';
  editingNoteId: string | null = null;
  editingContent = '';
  mentionTarget: MentionTarget | null = null;
  mentionQuery = '';

  readonly abbreviateMentionTitle = abbreviateMentionTitle;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.referenceId = params.get('id') ?? '';
      this.newNoteContent = '';
      this.cancelEdit();
      this.mentionTarget = null;
      this.reference.set(null);
      this.notes.set([]);
      this.backlinks.set([]);
      this.load();
    });
  }

  load(): void {
    const id = this.referenceId;
    if (!id) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.referencesService.getById(id).subscribe({
      next: (ref) => {
        if (this.referenceId === id) {
          this.reference.set(ref);
        }
      },
      error: () => {
        if (this.referenceId === id) {
          this.errorMessage.set('Referencia nao encontrada.');
        }
      },
    });

    this.referencesService.getNotes(id).subscribe({
      next: (notes) => {
        if (this.referenceId !== id) {
          return;
        }

        this.notes.set(notes);
        this.isLoading.set(false);
      },
      error: () => {
        if (this.referenceId !== id) {
          return;
        }

        this.errorMessage.set('Nao foi possivel carregar as anotacoes.');
        this.isLoading.set(false);
      },
    });

    this.referencesService.getBacklinks(id).subscribe({
      next: (links) => {
        if (this.referenceId === id) {
          this.backlinks.set(links);
        }
      },
      error: () => {
        if (this.referenceId === id) {
          this.backlinks.set([]);
        }
      },
    });
  }

  openMentionPicker(target: MentionTarget): void {
    this.mentionTarget = this.mentionTarget === target ? null : target;
    if (!this.mentionTarget) {
      return;
    }

    this.mentionQuery = '';
    this.searchMentions();
  }

  searchMentions(): void {
    const query = this.mentionQuery.trim();
    this.referencesService.getAll(query || undefined).subscribe({
      next: (refs) => this.mentionResults.set(refs),
      error: () => this.mentionResults.set([]),
    });
  }

  insertMention(reference: Reference): void {
    const token = mentionToken(reference.title, reference.id);
    if (this.mentionTarget === 'new') {
      const element = this.newNoteInput()?.nativeElement;
      const inserted = insertAtCursor(this.newNoteContent, token, element);
      this.newNoteContent = inserted.value;
      focusAfterInsert(element, inserted.cursor);
    } else if (this.mentionTarget === 'edit') {
      const element = this.editNoteInput()?.nativeElement;
      const inserted = insertAtCursor(this.editingContent, token, element);
      this.editingContent = inserted.value;
      focusAfterInsert(element, inserted.cursor);
    }

    this.mentionTarget = null;
  }

  addNote(): void {
    const content = this.newNoteContent.trim();
    if (!content) {
      return;
    }

    this.referencesService.addNote(this.referenceId, content).subscribe({
      next: () => {
        this.newNoteContent = '';
        this.mentionTarget = null;
        this.load();
      },
      error: () => this.errorMessage.set('Nao foi possivel adicionar a anotacao.'),
    });
  }

  startEdit(note: Note): void {
    this.editingNoteId = note.id;
    this.editingContent = note.content;
    this.mentionTarget = null;
  }

  cancelEdit(): void {
    this.editingNoteId = null;
    this.editingContent = '';
    if (this.mentionTarget === 'edit') {
      this.mentionTarget = null;
    }
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

function insertAtCursor(
  value: string,
  token: string,
  element: HTMLTextAreaElement | undefined,
): { value: string; cursor: number } {
  const start = element?.selectionStart ?? value.length;
  const end = element?.selectionEnd ?? start;
  return {
    value: value.slice(0, start) + token + value.slice(end),
    cursor: start + token.length,
  };
}

function focusAfterInsert(element: HTMLTextAreaElement | undefined, cursor: number): void {
  if (!element) {
    return;
  }

  queueMicrotask(() => {
    element.focus();
    element.setSelectionRange(cursor, cursor);
  });
}
