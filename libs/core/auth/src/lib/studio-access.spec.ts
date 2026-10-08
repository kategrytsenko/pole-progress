import { toAuthError } from './auth-errors';
import { destinationAfterAuth, safeInternalPath } from './auth-redirect';
import { resolveStudioAccess } from './studio-access';

describe('resolveStudioAccess', () => {
  it('lets staff in without a pass', () => {
    expect(resolveStudioAccess({ role: 'admin', databaseAllows: false })).toBe('allowed');
    expect(resolveStudioAccess({ role: 'instructor', databaseAllows: false })).toBe('allowed');
  });

  it('lets a client in when the database confirms an active membership', () => {
    expect(resolveStudioAccess({ role: 'student', databaseAllows: true })).toBe('allowed');
    expect(resolveStudioAccess({ role: null, databaseAllows: true })).toBe('allowed');
  });

  it('blocks an account that is not staff and has no active membership', () => {
    expect(resolveStudioAccess({ role: 'student', databaseAllows: false })).toBe('restricted');
    expect(resolveStudioAccess({ role: null, databaseAllows: false })).toBe('restricted');
  });
});

describe('post-auth navigation', () => {
  it('keeps only in-app paths', () => {
    expect(safeInternalPath('/app/elements/1')).toBe('/app/elements/1');
    expect(safeInternalPath('https://evil.test')).toBeNull();
    expect(safeInternalPath('//evil.test')).toBeNull();
    expect(safeInternalPath('/\\evil')).toBeNull();
    expect(safeInternalPath('')).toBeNull();
  });

  it('sends outsiders to the membership screen and members to the requested page', () => {
    expect(destinationAfterAuth(false, '/app')).toBe('/access-pending');
    expect(destinationAfterAuth(true, '/app/schedule')).toBe('/app/schedule');
    expect(destinationAfterAuth(true, 'https://evil.test')).toBe('/app');
  });
});

describe('toAuthError', () => {
  it('translates the failures people hit while signing in', () => {
    expect(toAuthError(new Error('Invalid login credentials'))).toBe('Невірний email або пароль.');
    expect(toAuthError(new Error('User already registered'))).toBe(
      'Цей email уже зареєстрований. Увійди з паролем.',
    );
    expect(toAuthError(new Error('Unsupported provider: instagram is not enabled'))).toBe(
      'Цей спосіб входу ще не підключений у студії. Скористайся email і паролем.',
    );
    expect(toAuthError(new Error('Email rate limit exceeded'))).toBe(
      'Забагато запитів. Зачекай трохи або увійди з паролем.',
    );
  });
});
