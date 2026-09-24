export interface NoteSegment {
  kind: 'text' | 'mention';
  text: string;
  referenceId: string | null;
  exists: boolean;
}

export interface Note {
  id: string;
  referenceId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  segments: NoteSegment[];
}

export interface NoteBacklink {
  noteId: string;
  excerpt: string;
  sourceReferenceId: string;
  sourceTitle: string;
  createdAt: string;
}
