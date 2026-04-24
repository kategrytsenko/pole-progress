import { expect, test } from '@playwright/test';

test('redirects unauthenticated user to /sign-in', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('**/sign-in');
  await expect(page).toHaveURL(/\/sign-in$/);
});
