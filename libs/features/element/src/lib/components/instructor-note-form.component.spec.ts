import { TestBed } from '@angular/core/testing';
import { InstructorNoteFormComponent } from './instructor-note-form.component';

describe('InstructorNoteFormComponent', () => {
  function setup(feedbackBody: string | null = null): {
    fixture: ReturnType<typeof TestBed.createComponent<InstructorNoteFormComponent>>;
    emitted: string[];
  } {
    const fixture = TestBed.createComponent(InstructorNoteFormComponent);
    fixture.componentRef.setInput('attemptId', 'attempt-1');
    fixture.componentRef.setInput('feedback', feedbackBody
      ? {
          author_id: 'coach',
          author_name: 'Оля',
          body: feedbackBody,
          updated_at: '2026-10-08T12:00:00.000Z',
        }
      : null);
    const emitted: string[] = [];
    fixture.componentInstance.saveNote.subscribe((body: string) => emitted.push(body));
    fixture.detectChanges();
    return { fixture, emitted };
  }

  function type(root: HTMLElement, value: string): void {
    const textarea = root.querySelector('textarea');
    if (!textarea) throw new Error('textarea missing');
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
  }

  it('emits a trimmed comment for a new note', () => {
    const { fixture, emitted } = setup();
    const root = fixture.nativeElement as HTMLElement;

    type(root, '  Тримайте корпус  ');
    fixture.detectChanges();
    submit(root);

    expect(emitted).toEqual(['Тримайте корпус']);
    expect(root.textContent).toContain('Зберегти коментар');
  });

  it('keeps save disabled until the comment changes', () => {
    const { fixture, emitted } = setup('Вже збережено');
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector('button');

    expect(button?.hasAttribute('disabled')).toBe(true);
    expect(root.textContent).toContain('Оновити коментар');
    expect(root.textContent).toContain('Оля');

    submit(root);
    expect(emitted).toEqual([]);

    type(root, 'Новий акцент');
    fixture.detectChanges();
    expect(button?.hasAttribute('disabled')).toBe(false);

    submit(root);
    expect(emitted).toEqual(['Новий акцент']);
  });
});

function submit(root: HTMLElement): void {
  root.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
