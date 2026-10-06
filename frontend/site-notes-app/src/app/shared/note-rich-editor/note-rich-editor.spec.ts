import { TestBed } from '@angular/core/testing';
import type { Editor } from '@tiptap/core';
import { parseNoteContent, serializeNoteContent } from './note-content.util';
import { NoteRichEditor } from './note-rich-editor';

/** O editor e privado na classe; os testes acessam via cast para verificar o estado interno do TipTap. */
function editorOf(component: NoteRichEditor): Editor {
  return (component as unknown as { editor: Editor }).editor;
}

describe('NoteRichEditor', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteRichEditor],
    }).compileComponents();
  });

  async function createFixture(content = '') {
    const fixture = TestBed.createComponent(NoteRichEditor);
    fixture.componentRef.setInput('content', content);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('cria o editor TipTap sobre o host apos a renderizacao', async () => {
    const fixture = await createFixture();

    const editor = editorOf(fixture.componentInstance);
    expect(editor).toBeTruthy();
    expect(editor.isDestroyed).toBe(false);
    expect(fixture.nativeElement.querySelector('.editor-host .ProseMirror')).toBeTruthy();
  });

  it('sincroniza content (model) para o editor sem disparar onUpdate de volta', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    const doc = serializeNoteContent(parseNoteContent('ola mundo'));

    fixture.componentRef.setInput('content', doc);
    fixture.detectChanges();
    await fixture.whenStable();

    const editor = editorOf(component);
    expect(serializeNoteContent(editor.getJSON())).toBe(doc);
    // Sem loop: o valor do model continua estavel apos a sincronizacao (nao foi reescrito por onUpdate).
    expect(component.content()).toBe(doc);
  });

  it('applyLink com URL invalida (nao http/https) seta erro e nao aplica o link', async () => {
    const fixture = await createFixture('texto com link');
    const component = fixture.componentInstance;
    const editor = editorOf(component);

    editor.commands.setTextSelection({ from: 1, to: 5 });
    component.linkUrl.set('javascript:alert(1)');
    component.applyLink();

    expect(component.linkError()).toBe('Informe uma URL http ou https valida.');
    expect(editor.isActive('link')).toBe(false);
  });

  it('applyLink com selecao e URL valida aplica o link e fecha a bolha', async () => {
    const fixture = await createFixture('texto com link');
    const component = fixture.componentInstance;
    const editor = editorOf(component);

    editor.commands.setTextSelection({ from: 1, to: 5 });
    component.linkBubbleOpen.set(true);
    component.linkUrl.set('https://example.com');
    component.applyLink();

    expect(component.linkError()).toBeNull();
    expect(editor.isActive('link')).toBe(true);
    expect(editor.getAttributes('link')['href']).toBe('https://example.com/');
    expect(component.linkBubbleOpen()).toBe(false);
    expect(component.linkUrl()).toBe('');
  });

  it('onReferenceClick sem selecao mostra selectionHint e nao abre a bolha', async () => {
    const fixture = await createFixture('texto sem selecao');
    const component = fixture.componentInstance;

    component.onReferenceClick();

    expect(component.selectionHint()).toBe('Selecione o texto que sera o link.');
    expect(component.linkBubbleOpen()).toBe(false);
  });

  it('onLinkKeydown: Enter aplica o link e Escape fecha a bolha', async () => {
    const fixture = await createFixture('texto com link');
    const component = fixture.componentInstance;
    const editor = editorOf(component);
    editor.commands.setTextSelection({ from: 1, to: 5 });
    component.linkBubbleOpen.set(true);
    component.linkUrl.set('https://example.com');

    const enterEvent = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
    component.onLinkKeydown(enterEvent);

    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(editor.isActive('link')).toBe(true);
    expect(component.linkBubbleOpen()).toBe(false);

    component.linkBubbleOpen.set(true);
    component.linkUrl.set('https://outro.com');
    const escapeEvent = { key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent;
    component.onLinkKeydown(escapeEvent);

    expect(escapeEvent.preventDefault).toHaveBeenCalled();
    expect(component.linkBubbleOpen()).toBe(false);
    expect(component.linkUrl()).toBe('');
  });

  it('closeLinkBubble limpa url e erro', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    component.linkBubbleOpen.set(true);
    component.linkUrl.set('https://example.com');
    component.linkError.set('algum erro');

    component.closeLinkBubble();

    expect(component.linkBubbleOpen()).toBe(false);
    expect(component.linkUrl()).toBe('');
    expect(component.linkError()).toBeNull();
  });

  it('destroi o editor e remove listeners sem lancar erro', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    const editor = editorOf(component);

    expect(() => fixture.destroy()).not.toThrow();
    expect(editor.isDestroyed).toBe(true);
  });

  it('readonly (editable=false) nao registra o listener de captura e desabilita a edicao', async () => {
    const fixture = TestBed.createComponent(NoteRichEditor);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    const editor = editorOf(component);
    expect(editor.isEditable).toBe(false);

    expect(() => fixture.destroy()).not.toThrow();
  });
});
