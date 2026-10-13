import { isProfileComplete, ownProfileUpdate, profileContactIssues } from './profile-completion';

describe('profile completion', () => {
  it('rejects an empty name', () => {
    expect(isProfileComplete('', '+380671112233')).toBe(false);
    expect(profileContactIssues('', '+380671112233').name).toBe('Вкажи ім’я.');
  });

  it('rejects an empty phone', () => {
    expect(isProfileComplete('Олена', '')).toBe(false);
    expect(profileContactIssues('Олена', '').phone).toBe('Вкажи номер телефону.');
  });

  it('rejects a whitespace-only name or phone', () => {
    expect(isProfileComplete('   ', '+380671112233')).toBe(false);
    expect(isProfileComplete('Олена', ' \t\n ')).toBe(false);
    expect(profileContactIssues(' \t ', ' \n ')).toEqual({
      name: 'Вкажи ім’я.',
      phone: 'Вкажи номер телефону.',
    });
  });

  it('accepts a name and phone that remain after trimming', () => {
    expect(isProfileComplete('  Олена  ', '  +380671112233  ')).toBe(true);
    expect(ownProfileUpdate({ name: '  Олена  ', phone: '  +380671112233  ' })).toEqual({
      name: 'Олена',
      phone: '+380671112233',
    });
  });

  it('treats an existing profile with a name and no phone as incomplete', () => {
    expect(isProfileComplete('Демо клієнт', null)).toBe(false);
    expect(isProfileComplete('Демо клієнт', undefined)).toBe(false);
    expect(profileContactIssues('Демо клієнт', '').phone).toBe('Вкажи номер телефону.');
  });

  it('refuses a profile update that tries to change the role', () => {
    expect(() =>
      ownProfileUpdate({ name: 'Олена', phone: '+380671112233', role: 'admin' }),
    ).toThrow('Неможливо змінити роль.');

    const saved = ownProfileUpdate({ name: 'Олена', phone: '+380671112233' });
    expect(saved).toEqual({ name: 'Олена', phone: '+380671112233' });
    expect(Object.hasOwn(saved, 'role')).toBe(false);
  });
});
