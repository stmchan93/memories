import { expect, test } from '@playwright/test';
import { createTestAccount, createTinyPngBuffer, signIn, signUp, waitForPublicChapter } from './helpers/app';
import { cleanupUserBySlug } from './helpers/supabaseAdmin';

test.describe.serial('chapter app', () => {
  const account = createTestAccount();

  test.beforeAll(async () => {
    await cleanupUserBySlug(account.username);
  });

  test.afterAll(async () => {
    await cleanupUserBySlug(account.username);
  });

  test('sign up, save a day, add a photo, and see it in wrapped/public', async ({ page, context }) => {
    await signUp(page, account);

    await page.getByLabel('What did you do?').fill('- ate food\n- danced\n- tested things out');
    await page.getByLabel('Photo').setInputFiles({
      name: 'memory.png',
      mimeType: 'image/png',
      buffer: createTinyPngBuffer(),
    });
    await page.getByRole('button', { name: 'Save day' }).click();
    await expect(page.getByText('Day saved')).toBeVisible();

    await page.reload();
    await expect(page.locator('.photo-preview-card img')).toHaveCount(1);

    await page.getByRole('button', { name: 'Wrapped' }).click();
    await expect(page.getByRole('heading', { name: `${account.username}'s memories` })).toBeVisible();
    await expect(page.getByText('Days logged')).toBeVisible();
    await expect(page.getByText('Photos')).toBeVisible();
    await expect(page.locator('.memory-preview-card')).toContainText('ate food');

    const publicPage = await context.newPage();
    await waitForPublicChapter(publicPage, account.username, 'ate food');
    await expect(publicPage.getByRole('heading', { name: `${account.username}'s memories` })).toBeVisible();
    await expect(publicPage.locator('.memory-preview-card')).toContainText('ate food');
  });

  test('uploading a photo keeps the in-progress day text intact', async ({ page }) => {
    await signIn(page, account);

    const draftSummary =
      'Day 1 of unemployment\n- made carbonara udon with kristine\n- worked on memories app';

    await page.getByLabel('What did you do?').fill(draftSummary);
    await page.getByLabel('Photo').setInputFiles({
      name: 'memory-second.png',
      mimeType: 'image/png',
      buffer: createTinyPngBuffer(),
    });

    await expect(page.getByLabel('What did you do?')).toHaveValue(draftSummary);
    await expect(page.locator('.photo-preview-card img')).toHaveCount(1);
  });

  test('showcase item appears in wrapped and public page, and settings can copy the link', async ({
    page,
    context,
  }) => {
    await signIn(page, account);

    await page.getByRole('button', { name: 'Wrapped' }).click();
    await page.getByRole('button', { name: 'Manage showcase' }).click();
    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByLabel('Name or title').fill('Tiny habits landing page');
    await page.getByLabel('Short description').fill('A small thing from this chapter.');
    await page.getByRole('textbox', { name: 'Link' }).fill('https://example.com/tiny-habits');
    await page.getByLabel('Notes').fill('Shipping something small still counts.');
    await page.getByRole('button', { name: 'Save item' }).click();

    await expect(page.getByText('Saved Tiny habits landing page.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tiny habits landing page' })).toBeVisible();

    await page.getByRole('button', { name: 'Wrapped' }).click();
    await expect(page.getByText('Projects worked on')).toBeVisible();
    await expect(page.getByText('Tiny habits landing page')).toBeVisible();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Copy public link' }).click();
    await expect(page.getByText('Public link copied')).toBeVisible();

    const publicPage = await context.newPage();
    await waitForPublicChapter(publicPage, account.username, 'Tiny habits landing page');
    await expect(publicPage.getByText('Tiny habits landing page')).toBeVisible();
  });

  test('past days are read-only', async ({ page }) => {
    await signIn(page, account);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayNumber = String(yesterday.getDate());

    await page
      .locator('.calendar-day:not(.muted)')
      .filter({ hasText: new RegExp(`^${dayNumber}$`) })
      .first()
      .click();
    await expect(page.getByText('Only today can be edited.')).toBeVisible();
    await expect(page.getByLabel('What did you do?')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Today only' })).toBeDisabled();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Log in to your chapter.' })).toBeVisible();

    await signIn(page, account);
  });
});
