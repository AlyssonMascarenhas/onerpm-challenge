import { expect, test } from '@playwright/test';
import { isolateSpotify, mockTracks } from './support/mock-api';

test.beforeEach(async ({ page }) => {
  await isolateSpotify(page);
  await mockTracks(page);
  await page.goto('/');
  await expect(page.locator('orp-track-card')).toHaveCount(10);
});

test('never scrolls horizontally, at any width the project covers', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
});

test('cards fit inside the viewport and are never cut off', async ({ page }) => {
  const viewport = page.viewportSize()!;

  for (const card of await page.locator('orp-track-card').all()) {
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  }
});

test('lays the cards out in as many columns as fit', async ({ page }, testInfo) => {
  const lefts = await page
    .locator('orp-track-card')
    .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left)));
  const columns = new Set(lefts).size;

  if (testInfo.project.name === 'mobile') {
    expect(columns).toBe(1);
  } else {
    expect(columns).toBe(3);
  }
});

test('cards of the same row have the same height', async ({ page }) => {
  const rows = await page.locator('orp-track-card').evaluateAll((cards) => {
    const byTop = new Map<number, number[]>();
    for (const card of cards) {
      const { top, height } = card.getBoundingClientRect();
      const key = Math.round(top + window.scrollY);
      byTop.set(key, [...(byTop.get(key) ?? []), Math.round(height)]);
    }
    return [...byTop.values()];
  });

  for (const heights of rows) {
    expect(new Set(heights).size).toBe(1);
  }
});

test('the header stays reachable while scrolling', async ({ page }) => {
  await page.mouse.wheel(0, 2000);

  await expect(page.getByRole('combobox', { name: 'Language' })).toBeInViewport();
  await expect(page.getByRole('button', { name: /Switch to the dark theme/ })).toBeInViewport();
});

test('nothing steals the focus on load, so the first Tab reaches the skip link', async ({
  page,
}) => {
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  expect(await page.locator('[autofocus]').count()).toBe(0);
});

test('the skip link is the first thing a keyboard user reaches and jumps to the content', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop concern');

  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press('Enter');

  await expect(page.getByRole('main')).toBeFocused();
});

test('the language list works with the keyboard alone', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop concern');

  await page.getByRole('combobox', { name: 'Language' }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ISRCs ausentes');
});

test.describe('with reduced motion requested', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the logo stops animating', async ({ page }) => {
    const name = await page
      .locator('.bar--1')
      .evaluate((bar) => getComputedStyle(bar).animationName);

    expect(name).toBe('none');
  });
});
