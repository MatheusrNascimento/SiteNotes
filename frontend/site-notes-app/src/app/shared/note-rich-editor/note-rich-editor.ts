import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Editor, Extension } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import {
  emptyDoc,
  noteContentHasText,
  parseNoteContent,
  sanitizeHttpUrl,
  serializeNoteContent,
} from './note-content.util';

function isLinkShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
}

@Component({
  selector: 'app-note-rich-editor',
  templateUrl: './note-rich-editor.html',
  styleUrl: './note-rich-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.readonly]': '!editable()',
  },
})
export class NoteRichEditor implements OnDestroy {
  readonly content = model<string>('');
  readonly editable = input(true);
  readonly placeholder = input('');
  readonly ariaLabel = input('Anotacao');

  private readonly host = viewChild<ElementRef<HTMLDivElement>>('editorHost');

  readonly linkBubbleOpen = signal(false);
  readonly linkUrl = signal('');
  readonly linkError = signal<string | null>(null);
  readonly bubbleStyle = signal<Record<string, string>>({});

  private editor: Editor | null = null;
  private syncingFromInput = false;
  private initialized = false;
  private removeCaptureListener: (() => void) | null = null;

  constructor() {
    effect(() => {
      const host = this.host();
      if (!host || this.initialized) {
        return;
      }

      this.initialized = true;
      this.createEditor(host.nativeElement);
    });

    effect(() => {
      const editable = this.editable();
      this.editor?.setEditable(editable);
      if (!editable) {
        this.closeLinkBubble();
      }
    });

    effect(() => {
      const next = this.content();
      const editor = this.editor;
      if (!editor || this.syncingFromInput) {
        return;
      }

      const current = serializeNoteContent(editor.getJSON());
      const incoming = noteContentHasText(next)
        ? serializeNoteContent(parseNoteContent(next))
        : serializeNoteContent(emptyDoc());

      if (current === incoming) {
        return;
      }

      this.syncingFromInput = true;
      editor.commands.setContent(parseNoteContent(next || ''), { emitUpdate: false });
      this.syncingFromInput = false;
    });
  }

  ngOnDestroy(): void {
    this.removeCaptureListener?.();
    this.removeCaptureListener = null;
    this.editor?.destroy();
    this.editor = null;
  }

  applyLink(): void {
    const editor = this.editor;
    if (!editor) {
      return;
    }

    const href = sanitizeHttpUrl(this.linkUrl());
    if (!href) {
      this.linkError.set('Informe uma URL http ou https valida.');
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    this.closeLinkBubble();
  }

  closeLinkBubble(): void {
    this.linkBubbleOpen.set(false);
    this.linkUrl.set('');
    this.linkError.set(null);
  }

  onLinkKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.applyLink();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLinkBubble();
      this.editor?.commands.focus();
    }
  }

  private createEditor(element: HTMLElement): void {
    const initial = this.content();
    const linkShortcut = Extension.create({
      name: 'noteLinkShortcut',
      addKeyboardShortcuts: () => ({
        'Mod-k': () => {
          if (!this.editable()) {
            return false;
          }

          this.openLinkBubble();
          return true;
        },
      }),
    });

    this.editor = new Editor({
      element,
      editable: this.editable(),
      content: parseNoteContent(initial || ''),
      extensions: [
        StarterKit.configure({
          bold: false,
          italic: false,
          strike: false,
          code: false,
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Link.configure({
          autolink: false,
          linkOnPaste: true,
          defaultProtocol: 'https',
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
            class: 'note-link',
          },
          isAllowedUri: (url, ctx) =>
            sanitizeHttpUrl(url) !== null && ctx.defaultValidate(url),
          shouldAutoLink: (url) => sanitizeHttpUrl(url) !== null,
        }),
        Placeholder.configure({
          placeholder: () => this.placeholder(),
          showOnlyWhenEditable: true,
        }),
        linkShortcut,
      ],
      editorProps: {
        attributes: {
          class: 'note-editor-surface',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': this.ariaLabel(),
        },
        handleDOMEvents: {
          // Chrome/Edge usam Ctrl+K para a barra de endereco; capturar cedo evita isso.
          keydown: (_view, event) => {
            if (!this.editable() || !isLinkShortcut(event)) {
              return false;
            }

            event.preventDefault();
            event.stopPropagation();
            this.openLinkBubble();
            return true;
          },
        },
      },
      onUpdate: ({ editor }) => {
        if (this.syncingFromInput) {
          return;
        }

        this.syncingFromInput = true;
        this.content.set(serializeNoteContent(editor.getJSON()));
        this.syncingFromInput = false;
      },
    });

    // Capture no document: Ctrl+K do Chrome foca a barra de URL se nao for barrado cedo.
    // Registra so em editores editaveis; readonly nao precisa (evita N listeners na lista).
    if (this.editable()) {
      const dom = this.editor.view.dom;
      const onCaptureKeyDown = (event: KeyboardEvent) => {
        if (!this.editable() || !isLinkShortcut(event)) {
          return;
        }

        const editor = this.editor;
        if (!editor?.isFocused && !dom.contains(document.activeElement)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.openLinkBubble();
      };

      document.addEventListener('keydown', onCaptureKeyDown, true);
      this.removeCaptureListener = () =>
        document.removeEventListener('keydown', onCaptureKeyDown, true);
    }
  }

  private openLinkBubble(): void {
    const editor = this.editor;
    if (!editor || !this.editable()) {
      return;
    }

    const { from, to } = editor.state.selection;
    if (from === to) {
      return;
    }

    const previous = editor.getAttributes('link')['href'];
    this.linkUrl.set(typeof previous === 'string' ? previous : '');
    this.linkError.set(null);
    this.positionBubble();
    this.linkBubbleOpen.set(true);

    queueMicrotask(() => {
      const input = document.getElementById('note-link-url') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  private positionBubble(): void {
    const editor = this.editor;
    if (!editor) {
      return;
    }

    const { view } = editor;
    const { from, to } = view.state.selection;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    const left = (start.left + end.left) / 2;
    const top = end.bottom + 8;

    this.bubbleStyle.set({
      left: `${Math.max(12, left)}px`,
      top: `${top}px`,
    });
  }
}
