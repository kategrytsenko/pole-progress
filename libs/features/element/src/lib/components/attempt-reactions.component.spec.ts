import { TestBed } from '@angular/core/testing';
import { AttemptReactionsComponent } from './attempt-reactions.component';

const comment = {
  id: 'c1',
  attempt_id: 'attempt',
  author_id: 'peer',
  author_name: 'Марійка',
  body: 'Гарна спроба',
  created_at: '2026-10-09T10:00:00.000Z',
  updated_at: '2026-10-09T10:00:00.000Z',
};

describe('AttemptReactionsComponent', () => {
  it('shows a pressed like and a neutral comment for a peer', () => {
    const fixture = TestBed.createComponent(AttemptReactionsComponent);
    fixture.componentRef.setInput('attemptId', 'attempt');
    fixture.componentRef.setInput('attemptOwnerId', 'owner');
    fixture.componentRef.setInput('viewerId', 'peer');
    fixture.componentRef.setInput('journalPublic', true);
    fixture.componentRef.setInput('hasStudioAccess', true);
    fixture.componentRef.setInput('likes', { count: 1, likedByMe: true });
    fixture.componentRef.setInput('comments', [comment]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const like = root.querySelector('button[aria-pressed="true"]');
    expect(like?.textContent).toContain('Подобається');
    expect(like?.textContent).toContain('1');
    expect(root.textContent).toContain('Марійка');
    expect(root.textContent).toContain('Гарна спроба');
    expect(root.querySelector('[class*="amber"]')).toBeNull();
    expect(root.textContent).toContain('Змінити');
    expect(root.textContent).not.toContain('Інструктор');
  });

  it('hides the composer and like button from the attempt owner', () => {
    const fixture = TestBed.createComponent(AttemptReactionsComponent);
    fixture.componentRef.setInput('attemptId', 'attempt');
    fixture.componentRef.setInput('attemptOwnerId', 'owner');
    fixture.componentRef.setInput('viewerId', 'owner');
    fixture.componentRef.setInput('journalPublic', true);
    fixture.componentRef.setInput('hasStudioAccess', true);
    fixture.componentRef.setInput('likes', { count: 1, likedByMe: false });
    fixture.componentRef.setInput('comments', [comment]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('button[aria-pressed]')).toBeNull();
    expect(root.querySelector('textarea')).toBeNull();
    expect(root.textContent).toContain('Видалити');
    expect(root.textContent).not.toContain('Змінити');
  });

  it('keeps an existing comment visible to the owner after the journal is private', () => {
    const fixture = TestBed.createComponent(AttemptReactionsComponent);
    fixture.componentRef.setInput('attemptId', 'attempt');
    fixture.componentRef.setInput('attemptOwnerId', 'owner');
    fixture.componentRef.setInput('viewerId', 'owner');
    fixture.componentRef.setInput('journalPublic', false);
    fixture.componentRef.setInput('hasStudioAccess', true);
    fixture.componentRef.setInput('likes', { count: 2, likedByMe: false });
    fixture.componentRef.setInput('comments', [comment]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Гарна спроба');
    expect(root.textContent).toContain('2');
    expect(root.querySelector('textarea')).toBeNull();
  });
});
