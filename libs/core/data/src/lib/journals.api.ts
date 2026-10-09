import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@org/supabase';
import {
  commentBody,
  commentsByAttempt,
  mapAttemptComment,
  summarizeLikes,
  type AttemptComment,
  type AttemptCommentRow,
  type LikeRow,
  type LikeSummary,
} from './journal';

/** A profile that opted into a public journal. RLS hides everyone else. */
export interface PublicJournal {
  id: string;
  name: string | null;
  created_at: string;
}

interface JournalFlagRow {
  journal_public: boolean;
}

const COMMENT_COLUMNS =
  'id, attempt_id, author_id, body, created_at, updated_at, author:profiles(name)';

export interface AttemptReactions {
  likes: ReadonlyMap<string, LikeSummary>;
  comments: ReadonlyMap<string, AttemptComment[]>;
}

@Injectable({ providedIn: 'root' })
export class JournalsApi {
  private readonly client = inject<SupabaseClient>(SUPABASE_CLIENT);

  async listPublicJournals(): Promise<PublicJournal[]> {
    await this.requireUid();

    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, created_at')
      .eq('journal_public', true)
      .order('name', { ascending: true, nullsFirst: false })
      .returns<PublicJournal[]>();

    if (error) throw error;
    return data ?? [];
  }

  /** Null when the journal is private or the viewer cannot see that profile. */
  async getPublicJournal(userId: string): Promise<PublicJournal | null> {
    await this.requireUid();

    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, created_at')
      .eq('id', userId)
      .eq('journal_public', true)
      .maybeSingle<PublicJournal>();

    if (error) throw error;
    return data ?? null;
  }

  /**
   * The flag for one profile the viewer can read.
   * A hidden private profile comes back false, which matches "no rows".
   */
  async isJournalPublic(userId?: string): Promise<boolean> {
    const id = userId ?? (await this.requireUid());

    const { data, error } = await this.client
      .from('profiles')
      .select('journal_public')
      .eq('id', id)
      .maybeSingle<JournalFlagRow>();

    if (error) throw error;
    return data?.journal_public === true;
  }

  /** Updates only journal_public on the signed-in profile. */
  async setMyJournalPublic(isPublic: boolean): Promise<void> {
    const uid = await this.requireUid();

    const { data, error } = await this.client
      .from('profiles')
      .update({ journal_public: isPublic })
      .eq('id', uid)
      .select('journal_public')
      .single<JournalFlagRow>();

    if (error) throw error;
    if (!data || data.journal_public !== isPublic) {
      throw new Error('Не вдалося змінити видимість щоденника');
    }
  }

  async loadReactions(attemptIds: readonly string[]): Promise<AttemptReactions> {
    const uid = await this.requireUid();
    if (attemptIds.length === 0) {
      return { likes: new Map(), comments: new Map() };
    }

    const [likesResult, commentsResult] = await Promise.all([
      this.client
        .from('attempt_likes')
        .select('attempt_id, user_id')
        .in('attempt_id', [...attemptIds])
        .returns<LikeRow[]>(),
      this.client
        .from('attempt_comments')
        .select(COMMENT_COLUMNS)
        .in('attempt_id', [...attemptIds])
        .returns<AttemptCommentRow[]>(),
    ]);

    if (likesResult.error) throw likesResult.error;
    if (commentsResult.error) throw commentsResult.error;

    return {
      likes: summarizeLikes(likesResult.data ?? [], uid, attemptIds),
      comments: commentsByAttempt((commentsResult.data ?? []).map(mapAttemptComment)),
    };
  }

  async like(attemptId: string): Promise<void> {
    const uid = await this.requireUid();
    const { error } = await this.client.from('attempt_likes').insert({
      attempt_id: attemptId,
      user_id: uid,
    });

    if (error && !isUniqueViolation(error)) throw error;
  }

  async unlike(attemptId: string): Promise<void> {
    const uid = await this.requireUid();
    const { error } = await this.client
      .from('attempt_likes')
      .delete()
      .eq('attempt_id', attemptId)
      .eq('user_id', uid);

    if (error) throw error;
  }

  async addComment(attemptId: string, body: string): Promise<AttemptComment> {
    const uid = await this.requireUid();
    const { data, error } = await this.client
      .from('attempt_comments')
      .insert({
        attempt_id: attemptId,
        author_id: uid,
        body: commentBody(body),
      })
      .select(COMMENT_COLUMNS)
      .single<AttemptCommentRow>();

    if (error) throw error;
    if (!data) throw new Error('Коментар не збережено');
    return mapAttemptComment(data);
  }

  async updateComment(commentId: string, body: string): Promise<AttemptComment> {
    const uid = await this.requireUid();
    const { data, error } = await this.client
      .from('attempt_comments')
      .update({ body: commentBody(body) })
      .eq('id', commentId)
      .eq('author_id', uid)
      .select(COMMENT_COLUMNS)
      .single<AttemptCommentRow>();

    if (error) throw error;
    if (!data) throw new Error('Коментар не збережено');
    return mapAttemptComment(data);
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.requireUid();
    const { data, error } = await this.client
      .from('attempt_comments')
      .delete()
      .eq('id', commentId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Коментар не знайдено');
  }

  private async requireUid(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    const uid = data.user?.id;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
