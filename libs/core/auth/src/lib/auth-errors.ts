function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

/** Maps Supabase auth failures to short Ukrainian copy. */
export function toAuthError(err: unknown, fallback = 'Не вдалось увійти'): string {
  const message = toErrorMessage(err, fallback);
  const normalized = message.toLowerCase();

  if (normalized.includes('code verifier')) {
    return 'Посилання відкрито в іншому браузері. Запроси нове і відкрий його в цьому ж вікні.';
  }
  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) {
    return 'Невірний email або пароль.';
  }
  if (
    normalized.includes('already registered')
    || normalized.includes('already been registered')
    || normalized.includes('user already exists')
  ) {
    return 'Цей email уже зареєстрований. Увійди з паролем.';
  }
  if (
    normalized.includes('password')
    && (normalized.includes('at least')
      || normalized.includes('weak')
      || normalized.includes('short')
      || normalized.includes('6'))
  ) {
    return 'Пароль має містити щонайменше 6 символів.';
  }
  if (
    normalized.includes('unsupported provider')
    || normalized.includes('provider is not enabled')
    || (normalized.includes('provider') && normalized.includes('not enabled'))
  ) {
    return 'Цей спосіб входу ще не підключений у студії. Скористайся email і паролем.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many') || normalized.includes('email rate')) {
    return 'Забагато запитів. Зачекай трохи або увійди з паролем.';
  }
  if (normalized.includes('expired') || normalized.includes('invalid') || normalized.includes('otp')) {
    return 'Посилання недійсне або застаріло. Запроси нове.';
  }

  return message;
}
