import { accessBenefitCopy } from './access-benefit';

describe('accessBenefitCopy', () => {
  it('explains a blocked action and keeps the profile separate from the pass', () => {
    const copy = accessBenefitCopy({
      profileComplete: false,
      hasStudioAccess: false,
      redirected: true,
    });

    expect(copy?.title).toContain('ім’я та номер телефону');
    expect(copy?.now).toContain('публічні щоденники');
    expect(copy?.profile).toContain('не дає абонемент');
    expect(copy?.pass).toContain('власний щоденник');
    expect(copy?.pass).toContain('оформлює студія');
  });

  it('omits the blocked-action title when the user opened the profile directly', () => {
    const copy = accessBenefitCopy({
      profileComplete: false,
      hasStudioAccess: false,
      redirected: false,
    });

    expect(copy?.title).toBeNull();
    expect(copy?.profile).toBeTruthy();
    expect(copy?.pass).toContain('абонементом');
  });

  it('does not sell an абонемент to someone who already has studio access', () => {
    const copy = accessBenefitCopy({
      profileComplete: false,
      hasStudioAccess: true,
      redirected: true,
    });

    expect(copy?.pass).toContain('Доступ до студії вже є');
    expect(copy?.pass).not.toContain('оформлює студія');
  });

  it('drops the profile step once the name and phone are saved', () => {
    const copy = accessBenefitCopy({
      profileComplete: true,
      hasStudioAccess: false,
      redirected: true,
    });

    expect(copy?.title).toBeNull();
    expect(copy?.profile).toBeNull();
    expect(copy?.pass).toContain('власний щоденник');
  });

  it('says nothing extra when the profile and studio access are both open', () => {
    expect(
      accessBenefitCopy({
        profileComplete: true,
        hasStudioAccess: true,
        redirected: false,
      }),
    ).toBeNull();
  });
});
