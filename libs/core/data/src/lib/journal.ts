export const COMMENT_MAX_LENGTH = 2000;

export interface LikeSummary {
  count: number;
  likedByMe: boolean;
}

export interface AttemptComment {
  id: string;
  attempt_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface AttemptCommentRow {
  id: string;
  attempt_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  author: unknown;
}

export interface LikeRow {
  attempt_id: string;
  user_id: string;
}

export interface JournalVisibility {
  viewerId: string | null;
  attemptOwnerId: string;
  journalPublic: boolean;
  hasStudioAccess: boolean;
}

const EMPTY_LIKE: LikeSummary = { count: 0, likedByMe: false };

export function commentBody(value: string): string {
  const body = value.trim();
  if (body.length < 1) throw new Error('Коментар не може бути порожнім');
  if (body.length > COMMENT_MAX_LENGTH) throw new Error('Коментар занадто довгий');
  return body;
}

/** A peer reads another diary only when that owner opted in and the viewer has studio access. */
export function canReadPeerJournal(journalPublic: boolean, hasStudioAccess: boolean): boolean {
  return journalPublic && hasStudioAccess;
}

export function canLikeAttempt(input: JournalVisibility): boolean {
  return (
    input.viewerId !== null &&
    input.viewerId !== input.attemptOwnerId &&
    input.journalPublic &&
    input.hasStudioAccess
  );
}

export function canCommentOnAttempt(input: JournalVisibility): boolean {
  return canLikeAttempt(input);
}

export function canEditComment(authorId: string | null, viewerId: string | null): boolean {
  return viewerId !== null && authorId === viewerId;
}

/** The attempt owner can always delete. The author can delete only while the journal is public. */
export function canDeleteComment(
  input: JournalVisibility & { authorId: string | null },
): boolean {
  if (input.viewerId === null) return false;
  if (input.viewerId === input.attemptOwnerId) return true;
  return (
    input.authorId === input.viewerId && input.journalPublic && input.hasStudioAccess
  );
}

export function applyLikeToggle(summary: LikeSummary): LikeSummary {
  if (summary.likedByMe) {
    return { likedByMe: false, count: Math.max(0, summary.count - 1) };
  }
  return { likedByMe: true, count: summary.count + 1 };
}

export function summarizeLikes(
  rows: readonly LikeRow[],
  viewerId: string,
  attemptIds: readonly string[],
): Map<string, LikeSummary> {
  const summaries = new Map<string, LikeSummary>();
  for (const attemptId of attemptIds) {
    summaries.set(attemptId, { ...EMPTY_LIKE });
  }

  for (const row of rows) {
    const current = summaries.get(row.attempt_id) ?? { ...EMPTY_LIKE };
    summaries.set(row.attempt_id, {
      count: current.count + 1,
      likedByMe: current.likedByMe || row.user_id === viewerId,
    });
  }

  return summaries;
}

/** Oldest first, so the timeline renders newest last. */
export function commentsByAttempt(
  comments: readonly AttemptComment[],
): Map<string, AttemptComment[]> {
  const sorted = [...comments].sort((a, b) => {
    const byTime = a.created_at.localeCompare(b.created_at);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });

  const grouped = new Map<string, AttemptComment[]>();
  for (const comment of sorted) {
    const list = grouped.get(comment.attempt_id);
    if (list) list.push(comment);
    else grouped.set(comment.attempt_id, [comment]);
  }
  return grouped;
}

export function mapAttemptComment(row: AttemptCommentRow): AttemptComment {
  return {
    id: row.id,
    attempt_id: row.attempt_id,
    author_id: row.author_id,
    author_name: readAuthorName(row.author),
    body: row.body.trim(),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function readAuthorName(value: unknown): string | null {
  const author = Array.isArray(value) ? value[0] : value;
  if (typeof author !== 'object' || author === null) return null;
  const name = (author as Record<string, unknown>)['name'];
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}
