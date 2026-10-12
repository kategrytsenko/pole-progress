import { toAuthError } from './auth-errors';
import { destinationAfterAuth, safeInternalPath } from './auth-redirect';
import { toEmailOtpType } from './email-otp';
import { passwordFormError } from './password-rules';
import { signUpOutcome } from './sign-up-outcome';
import { resolveStudioAccess } from './studio-access';

describe('resolveStudioAccess', () => {
  it('lets an admin in without a pass', () => {
    expect(resolveStudioAccess({ role: 'admin', databaseAllows: false })).toBe('allowed');
  });

  it('lets a client in when the database confirms an active membership', () => {
    expect(resolveStudioAccess({ role: 'student', databaseAllows: true })).toBe('allowed');
    expect(resolveStudioAccess({ role: null, databaseAllows: true })).toBe('allowed');
  });

  it('blocks an account that is not an admin and has no active membership', () => {
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
    expect(toAuthError(new Error('Email not confirmed'))).toBe(
      'Спочатку підтверди email. Перевір пошту і відкрий лист від студії.',
    );
    expect(toAuthError(new Error('Provider is not enabled'))).toBe(
      'Цей спосіб входу ще не підключений у студії. Скористайся email і паролем.',
    );
    expect(toAuthError(new Error('Email rate limit exceeded'))).toBe(
      'Забагато запитів. Зачекай трохи або увійди з паролем.',
    );
    expect(toAuthError('access_denied')).toBe('Вхід скасовано. Можна спробувати ще раз.');
    expect(toAuthError(new Error('Email link is invalid or has expired'))).toBe(
      'Посилання недійсне або застаріло. Запроси нове.',
    );
    expect(toAuthError(new Error('Invalid Refresh Token'))).toBe('Invalid Refresh Token');
    expect(toAuthError(new Error('Magic link sign-in is disabled'))).toBe(
      'Вхід за посиланням більше не підтримується. Увійди з паролем або віднови його.',
    );
  });
});

describe('signUpOutcome', () => {
  it('treats an empty identity list as an existing account', () => {
    expect(signUpOutcome(true, 1)).toBe('signed-in');
    expect(signUpOutcome(false, 1)).toBe('confirm-email');
    expect(signUpOutcome(false, 0)).toBe('already-registered');
    expect(signUpOutcome(false, null)).toBe('confirm-email');
  });
});

describe('toEmailOtpType', () => {
  it('accepts recovery and confirmation, and rejects magic links', () => {
    expect(toEmailOtpType('recovery')).toBe('recovery');
    expect(toEmailOtpType('signup')).toBe('signup');
    expect(toEmailOtpType('magiclink')).toBeNull();
    expect(toEmailOtpType(null)).toBeNull();
    expect(toEmailOtpType('sms')).toBeNull();
  });
});

describe('passwordFormError', () => {
  it('checks length and confirmation', () => {
    expect(passwordFormError('short', null)).toBe('Пароль має містити щонайменше 6 символів.');
    expect(passwordFormError('longenough', 'other')).toBe('Паролі не збігаються.');
    expect(passwordFormError('longenough', 'longenough')).toBeNull();
    expect(passwordFormError('longenough', null)).toBeNull();
  });
});
