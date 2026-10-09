import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import {
  canCommentOnAttempt,
  canDeleteComment,
  canEditComment,
  canLikeAttempt,
  commentBody,
  studentLabel,
  type AttemptComment,
  type LikeSummary,
} from '@org/data';

@Component({
  selector: 'pp-attempt-reactions',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="mt-4 border-t border-neutral-200 pt-3">
        @if (canLike()) {
          <button
            type="button"
            [attr.aria-pressed]="likes.likedByMe"
            [disabled]="busy"
            (click)="toggleLike.emit()"
            [class]="likeClass()"
          >
            Подобається
            <span class="tabular-nums">{{ likes.count }}</span>
          </button>
        } @else {
          <p class="text-sm text-neutral-600">
            Подобається
            <span class="font-semibold tabular-nums text-neutral-900">{{ likes.count }}</span>
          </p>
        }

        @if (comments.length === 0) {
          <p class="mt-3 text-sm text-neutral-500">Коментарів ще немає.</p>
        } @else {
          <ul aria-label="Коментарі" class="mt-3 space-y-2">
            @for (comment of comments; track comment.id) {
              <li class="rounded-xl border border-neutral-200 px-3 py-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs font-semibold text-neutral-800">{{ author(comment) }}</span>
                  <time [attr.datetime]="comment.created_at" class="text-xs text-neutral-500">
                    {{ comment.created_at | date: 'dd.MM.yyyy' }}
                  </time>
                </div>

                @if (editingId() === comment.id) {
                  <form class="mt-2 space-y-2" (submit)="submitEdit($event, comment.id)">
                    <label class="sr-only" [attr.for]="'comment-edit-' + comment.id">Текст коментаря</label>
                    <textarea
                      [id]="'comment-edit-' + comment.id"
                      rows="3"
                      maxlength="2000"
                      [value]="draft()"
                      (input)="onDraft($event)"
                      class="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    ></textarea>
                    <div class="flex gap-2">
                      <button
                        type="submit"
                        [disabled]="busy"
                        class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        Зберегти
                      </button>
                      <button
                        type="button"
                        (click)="cancelEdit()"
                        class="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                      >
                        Скасувати
                      </button>
                    </div>
                  </form>
                } @else {
                  <p class="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{{ comment.body }}</p>
                  @if (canEdit(comment) || canDelete(comment)) {
                    <div class="mt-2 flex gap-3">
                      @if (canEdit(comment)) {
                        <button
                          type="button"
                          (click)="startEdit(comment)"
                          class="text-xs font-medium text-neutral-500 transition hover:text-primary"
                        >
                          Змінити
                        </button>
                      }
                      @if (canDelete(comment)) {
                        <button
                          type="button"
                          (click)="onDelete(comment.id)"
                          class="text-xs font-medium text-neutral-500 transition hover:text-red-600"
                        >
                          Видалити
                        </button>
                      }
                    </div>
                  }
                }
              </li>
            }
          </ul>
        }

        @if (canComment()) {
          <form class="mt-3 space-y-2" (submit)="submitNew($event)">
            <label class="sr-only" [attr.for]="'comment-new-' + attemptId">Новий коментар</label>
            <textarea
              [id]="'comment-new-' + attemptId"
              rows="2"
              maxlength="2000"
              placeholder="Написати коментар…"
              [value]="composer()"
              (input)="onComposer($event)"
              class="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            ></textarea>
            <button
              type="submit"
              [disabled]="busy"
              class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Надіслати
            </button>
          </form>
        }
      </div>
    }
  `,
})
export class AttemptReactionsComponent {
  @Input({ required: true }) attemptId!: string;
  @Input({ required: true }) attemptOwnerId!: string;
  @Input({ required: true }) viewerId!: string | null;
  @Input({ required: true }) journalPublic!: boolean;
  @Input({ required: true }) hasStudioAccess!: boolean;
  @Input({ required: true }) likes!: LikeSummary;
  @Input({ required: true }) comments!: readonly AttemptComment[];
  @Input() busy = false;

  @Output() readonly toggleLike = new EventEmitter<void>();
  @Output() readonly addComment = new EventEmitter<string>();
  @Output() readonly updateComment = new EventEmitter<{ id: string; body: string }>();
  @Output() readonly deleteComment = new EventEmitter<string>();

  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal('');
  protected readonly composer = signal('');

  protected visible(): boolean {
    if (this.canLike()) return true;
    if (this.likes.count > 0 || this.comments.length > 0) return true;
    return this.viewerIsOwner() && this.journalPublic;
  }

  protected canLike(): boolean {
    return canLikeAttempt(this.visibility());
  }

  protected canComment(): boolean {
    return canCommentOnAttempt(this.visibility());
  }

  protected canEdit(comment: AttemptComment): boolean {
    return canEditComment(comment.author_id, this.viewerId);
  }

  protected canDelete(comment: AttemptComment): boolean {
    return canDeleteComment({ ...this.visibility(), authorId: comment.author_id });
  }

  protected author(comment: AttemptComment): string {
    return studentLabel(comment.author_name);
  }

  protected likeClass(): string {
    const tone = this.likes.likedByMe
      ? 'border-primary bg-primary text-white'
      : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary';
    return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${tone}`;
  }

  protected startEdit(comment: AttemptComment): void {
    this.editingId.set(comment.id);
    this.draft.set(comment.body);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set('');
  }

  protected onDraft(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) return;
    this.draft.set(target.value);
  }

  protected onComposer(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) return;
    this.composer.set(target.value);
  }

  protected submitEdit(event: Event, commentId: string): void {
    event.preventDefault();
    const body = this.readBody(this.draft());
    if (!body) return;
    this.updateComment.emit({ id: commentId, body });
    this.cancelEdit();
  }

  protected submitNew(event: Event): void {
    event.preventDefault();
    const body = this.readBody(this.composer());
    if (!body) return;
    this.addComment.emit(body);
    this.composer.set('');
  }

  protected onDelete(commentId: string): void {
    if (typeof window !== 'undefined' && !window.confirm('Видалити цей коментар?')) return;
    this.deleteComment.emit(commentId);
  }

  private viewerIsOwner(): boolean {
    return this.viewerId !== null && this.viewerId === this.attemptOwnerId;
  }

  private visibility() {
    return {
      viewerId: this.viewerId,
      attemptOwnerId: this.attemptOwnerId,
      journalPublic: this.journalPublic,
      hasStudioAccess: this.hasStudioAccess,
    };
  }

  private readBody(value: string): string | null {
    try {
      return commentBody(value);
    } catch {
      return null;
    }
  }
}
