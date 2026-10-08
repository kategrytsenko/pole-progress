import { TestBed } from '@angular/core/testing';
import { InstructorFeedbackComponent } from './instructor-feedback.component';

describe('InstructorFeedbackComponent', () => {
  it('shows the instructor badge, name, and comment apart from the student note', () => {
    const fixture = TestBed.createComponent(InstructorFeedbackComponent);
    fixture.componentRef.setInput('feedback', {
      author_id: 'coach',
      author_name: 'Оля',
      body: 'Тримай корпус ближче',
      updated_at: '2026-10-08T12:00:00.000Z',
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const aside = root.querySelector('aside');
    expect(aside?.getAttribute('aria-label')).toBe('Коментар інструктора');
    expect(aside?.textContent).toContain('Інструктор');
    expect(aside?.textContent).toContain('Оля');
    expect(aside?.textContent).toContain('Тримай корпус ближче');
    expect(aside?.textContent).toContain('08.10.2026');
  });
});
