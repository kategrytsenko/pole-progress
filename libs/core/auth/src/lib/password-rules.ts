export function passwordFormError(password: string, confirm: string | null): string | null {
  if (password.length < 6) return 'Пароль має містити щонайменше 6 символів.';
  if (confirm !== null && password !== confirm) return 'Паролі не збігаються.';
  return null;
}
