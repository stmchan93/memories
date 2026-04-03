import { expect, test } from '@playwright/test';

test('privacy page is reachable', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
  await expect(page.getByText('Google Calendar access')).toBeVisible();
});

test('terms page is reachable', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms of service' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Public sharing' })).toBeVisible();
});
