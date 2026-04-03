import { expect, type Page } from '@playwright/test';

export type TestAccount = {
  username: string;
  password: string;
};

export const createTestAccount = (): TestAccount => {
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  return {
    username: `e2e-${stamp}`.slice(0, 24),
    password: 'chapterpass123',
  };
};

export const signUp = async (page: Page, account: TestAccount) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a new account' }).click();
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByRole('heading', { name: `${account.username}'s chapter in life` }),
  ).toBeVisible({ timeout: 20_000 });
};

export const signIn = async (page: Page, account: TestAccount) => {
  await page.goto('/');
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(
    page.getByRole('heading', { name: `${account.username}'s chapter in life` }),
  ).toBeVisible({ timeout: 20_000 });
};

export const createTinyPngBuffer = () =>
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9s+W8AAAAASUVORK5CYII=',
    'base64',
  );

export const waitForPublicChapter = async (page: Page, username: string, expectedText: string) => {
  await expect
    .poll(
      async () => {
        await page.goto(`/${username}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1800);
        return page.locator('body').textContent();
      },
      { timeout: 20_000, intervals: [500, 1000, 1500] },
    )
    .toContain(expectedText);
};
