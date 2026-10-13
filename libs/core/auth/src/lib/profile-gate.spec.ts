import { browseAccessDecision, diaryAccessDecision } from './profile-gate';
import { profileCompletionPath } from './auth-redirect';

describe('diary access', () => {
  it('sends an incomplete profile to the profile page before the membership screen', () => {
    expect(
      diaryAccessDecision({
        authed: true,
        admin: false,
        profileComplete: false,
        studioAccess: 'restricted',
      }),
    ).toBe('profile');
    expect(
      diaryAccessDecision({
        authed: true,
        admin: false,
        profileComplete: false,
        studioAccess: 'allowed',
      }),
    ).toBe('profile');
  });

  it('sends a complete profile without a pass to the membership screen', () => {
    expect(
      diaryAccessDecision({
        authed: true,
        admin: false,
        profileComplete: true,
        studioAccess: 'restricted',
      }),
    ).toBe('membership');
  });

  it('lets a complete profile with studio access into the diary', () => {
    expect(
      diaryAccessDecision({
        authed: true,
        admin: false,
        profileComplete: true,
        studioAccess: 'allowed',
      }),
    ).toBe('allow');
  });

  it('keeps admin diary access when the profile is incomplete', () => {
    expect(
      diaryAccessDecision({
        authed: true,
        admin: true,
        profileComplete: false,
        studioAccess: 'allowed',
      }),
    ).toBe('allow');
  });

  it('asks a signed-out visitor to sign in', () => {
    expect(
      diaryAccessDecision({
        authed: false,
        admin: false,
        profileComplete: false,
        studioAccess: 'pending',
      }),
    ).toBe('sign-in');
  });
});

describe('schedule and journal browsing', () => {
  it('allows any signed-in user and stops everyone else', () => {
    expect(browseAccessDecision(true)).toBe('allow');
    expect(browseAccessDecision(false)).toBe('sign-in');
  });
});

describe('profile return path', () => {
  it('keeps a safe internal destination and drops an external one', () => {
    expect(profileCompletionPath('/app/schedule')).toBe(
      '/app/profile?notice=incomplete&redirect=%2Fapp%2Fschedule',
    );
    expect(profileCompletionPath('https://evil.test')).toBe('/app/profile?notice=incomplete');
    expect(profileCompletionPath('/app/profile')).toBe('/app/profile?notice=incomplete');
  });
});
