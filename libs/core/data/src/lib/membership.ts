import type { ClientPass } from './models';

/**
 * The pass that currently grants studio access: status active, and `now`
 * inside `valid_from` / `valid_until`. Matches `has_studio_access()`.
 * When several passes qualify, the one that lasts longest wins.
 */
export function currentClientPass(
  passes: readonly ClientPass[],
  now: Date,
): ClientPass | null {
  const instant = now.getTime();
  let best: ClientPass | null = null;
  let bestUntil = Number.NEGATIVE_INFINITY;

  for (const pass of passes) {
    if (pass.status !== 'active') continue;
    const from = Date.parse(pass.valid_from);
    const until = Date.parse(pass.valid_until);
    if (Number.isNaN(from) || Number.isNaN(until)) continue;
    if (from > instant || until < instant) continue;
    if (until > bestUntil) {
      best = pass;
      bestUntil = until;
    }
  }

  return best;
}
