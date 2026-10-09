import {
  applyLikeToggle,
  canCommentOnAttempt,
  canDeleteComment,
  canEditComment,
  canLikeAttempt,
  canReadPeerJournal,
  commentBody,
  commentsByAttempt,
  mapAttemptComment,
  summarizeLikes,
  type AttemptComment,
} from './journal';

const peer: {
  viewerId: string;
  attemptOwnerId: string;
  journalPublic: boolean;
  hasStudioAccess: boolean;
} = {
  viewerId: 'peer',
  attemptOwnerId: 'owner',
  journalPublic: true,
  hasStudioAccess: true,
};

describe('public journal visibility', () => {
  it('lets a studio peer read only a public journal', () => {
    expect(canReadPeerJournal(true, true)).toBe(true);
    expect(canReadPeerJournal(false, true)).toBe(false);
    expect(canReadPeerJournal(true, false)).toBe(false);
  });

  it('allows a like or comment only on someone else\'s public journal', () => {
    expect(canLikeAttempt(peer)).toBe(true);
    expect(canCommentOnAttempt(peer)).toBe(true);
    expect(canLikeAttempt({ ...peer, viewerId: 'owner' })).toBe(false);
    expect(canLikeAttempt({ ...peer, journalPublic: false })).toBe(false);
    expect(canCommentOnAttempt({ ...peer, hasStudioAccess: false })).toBe(false);
    expect(canLikeAttempt({ ...peer, viewerId: null })).toBe(false);
  });

  it('lets the author edit their comment and nobody else', () => {
    expect(canEditComment('peer', 'peer')).toBe(true);
    expect(canEditComment('peer', 'owner')).toBe(false);
    expect(canEditComment(null, 'peer')).toBe(false);
  });

  it('lets the owner delete a comment after the journal is private, and stops the author', () => {
    expect(
      canDeleteComment({ ...peer, authorId: 'peer', viewerId: 'owner', journalPublic: false }),
    ).toBe(true);
    expect(canDeleteComment({ ...peer, authorId: 'peer', journalPublic: false })).toBe(false);
    expect(canDeleteComment({ ...peer, authorId: 'peer' })).toBe(true);
    expect(canDeleteComment({ ...peer, authorId: 'someone-else' })).toBe(false);
  });
});

describe('like toggle', () => {
  it('adds one like, then removes it', () => {
    const liked = applyLikeToggle({ count: 2, likedByMe: false });
    expect(liked).toEqual({ count: 3, likedByMe: true });
    expect(applyLikeToggle(liked)).toEqual({ count: 2, likedByMe: false });
  });

  it('does not drive the count below zero', () => {
    expect(applyLikeToggle({ count: 0, likedByMe: true })).toEqual({
      count: 0,
      likedByMe: false,
    });
  });

  it('counts rows and marks the viewer', () => {
    const summaries = summarizeLikes(
      [
        { attempt_id: 'a', user_id: 'peer' },
        { attempt_id: 'a', user_id: 'other' },
        { attempt_id: 'b', user_id: 'other' },
      ],
      'peer',
      ['a', 'b', 'c'],
    );

    expect(summaries.get('a')).toEqual({ count: 2, likedByMe: true });
    expect(summaries.get('b')).toEqual({ count: 1, likedByMe: false });
    expect(summaries.get('c')).toEqual({ count: 0, likedByMe: false });
  });
});

describe('comments', () => {
  it('trims the body and rejects an empty or oversized comment', () => {
    expect(commentBody('  гарно  ')).toBe('гарно');
    expect(() => commentBody('   ')).toThrow('Коментар не може бути порожнім');
    expect(() => commentBody('я'.repeat(2001))).toThrow('Коментар занадто довгий');
  });

  it('reads the author name from an object or a one-element embed', () => {
    const row = {
      id: 'c1',
      attempt_id: 'a',
      author_id: 'peer',
      body: '  тримається  ',
      created_at: '2026-10-09T10:00:00.000Z',
      updated_at: '2026-10-09T10:00:00.000Z',
      author: { name: '  Марійка  ' },
    };

    expect(mapAttemptComment(row).author_name).toBe('Марійка');
    expect(mapAttemptComment(row).body).toBe('тримається');
    expect(mapAttemptComment({ ...row, author: [{ name: 'Марійка' }] }).author_name).toBe(
      'Марійка',
    );
    expect(mapAttemptComment({ ...row, author_id: null, author: null }).author_name).toBeNull();
  });

  it('groups comments oldest first', () => {
    const comments: AttemptComment[] = [
      comment('later', 'a', '2026-10-09T12:00:00.000Z'),
      comment('earlier', 'a', '2026-10-09T09:00:00.000Z'),
      comment('other', 'b', '2026-10-09T08:00:00.000Z'),
    ];

    const grouped = commentsByAttempt(comments);
    expect(grouped.get('a')?.map((item) => item.id)).toEqual(['earlier', 'later']);
    expect(grouped.get('b')?.map((item) => item.id)).toEqual(['other']);
  });
});

function comment(id: string, attemptId: string, createdAt: string): AttemptComment {
  return {
    id,
    attempt_id: attemptId,
    author_id: 'peer',
    author_name: 'Марійка',
    body: id,
    created_at: createdAt,
    updated_at: createdAt,
  };
}
