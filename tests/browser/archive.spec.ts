import { expect, test, type Page } from '@playwright/test';

const goTo = (page: Page, route: string) => page.goto(`.#${route}`);

async function firstArticle(page: Page) {
  await goTo(page, '/archive');
  const row = page.locator('.record-row').first();
  const id = (await row.locator('.record-id strong').innerText()).trim();
  const titleLink = row.getByRole('link').first();
  const href = await titleLink.getAttribute('href');
  if (!href) throw new Error('The first archive record has no article link.');
  return { href, id, titleLink };
}

test('home opens the Archive and route focus reaches its heading', async ({ page }) => {
  await goTo(page, '/');
  await expect(page.getByRole('heading', { level: 1, name: 'SCP–AI' })).toBeVisible();
  await expect(page.getByText('ACTIVE REGISTRY')).toBeVisible();

  await page.getByRole('link', { name: /Open index/i }).click();
  await expect(page).toHaveURL(/#\/archive$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Case files' })).toBeFocused();
});

test('search, class, and tag filters update results and the hash query', async ({ page }) => {
  await goTo(page, '/archive');
  const rows = page.locator('.record-row');
  await expect(rows).toHaveCount(13);

  const search = page.getByRole('searchbox', { name: 'Search records' });
  await search.fill('The Long Way');
  await expect(rows).toHaveCount(1);
  await expect(rows.getByRole('heading', { name: 'The Long Way' })).toBeVisible();
  await expect(page).toHaveURL(/q=The\+Long\+Way/);

  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await rows.first().getByRole('button', { name: 'Safe', exact: true }).click();
  await expect(page).toHaveURL(/class=Safe/);
  await expect(rows.locator('.record-class-filter:not([aria-pressed="true"])')).toHaveCount(0);

  const firstTag = rows.first().locator('.record-summary li button').first();
  const tag = (await firstTag.innerText()).trim();
  await firstTag.click();
  await expect(page).toHaveURL(new RegExp(`tag=${encodeURIComponent(tag)}`, 'i'));
  await expect.poll(async () => {
    const rowCount = await rows.count();
    const selectedTagCount = await rows.locator('.record-summary li button[aria-pressed="true"]').count();
    return rowCount > 0 && selectedTagCount === rowCount;
  }).toBe(true);
});

test('Archive Random File uses the currently visible records', async ({ page }) => {
  await goTo(page, '/archive');
  await page.getByRole('searchbox', { name: 'Search records' }).fill('The Long Way');
  const expectedId = (await page.locator('.record-id strong').innerText()).toLowerCase();
  await page.getByRole('button', { name: 'Open a random record from the current results' }).click();
  await expect(page).toHaveURL(new RegExp(`#\/scp\/${expectedId}$`, 'i'));

  await goTo(page, '/archive?q=no-record-can-match-this');
  await expect(page.getByRole('button', { name: 'No matching records available' })).toBeDisabled();
});

test('Archive query and scroll state survive article navigation and browser history', async ({ page }) => {
  await goTo(page, '/archive?q=SCP-AI&sort=newest');
  const lastRow = page.locator('.record-row').last();
  await lastRow.scrollIntoViewIfNeeded();
  const savedScroll = await page.evaluate(() => window.scrollY);
  expect(savedScroll).toBeGreaterThan(100);

  await lastRow.getByRole('link').first().click();
  await expect(page).toHaveURL(/#\/scp\//);
  await page.goBack();
  await expect(page).toHaveURL(/#\/archive\?q=SCP-AI&sort=newest$/);
  await expect(page.getByRole('searchbox', { name: 'Search records' })).toHaveValue('SCP-AI');
  await expect(page.getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(savedScroll - 80);

  await page.goForward();
  await expect(page).toHaveURL(/#\/scp\//);
});

test('articles support direct routes, return, sequence navigation, and invalid designations', async ({ page }) => {
  const { href, id } = await firstArticle(page);
  await page.goto(href);
  await expect(page.getByRole('heading', { level: 1, name: id })).toBeVisible();
  await expect(page.locator('.article-body')).not.toBeEmpty();
  await expect(page.locator(`link[data-article-asset]`)).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: id })).toBeVisible();

  const next = page.getByRole('link', { name: /Next record:/ });
  const nextLabel = await next.getAttribute('aria-label');
  await next.click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(id);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();

  await page.getByRole('link', { name: /Previous record:/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(id);

  const beforeRandom = await page.getByRole('heading', { level: 1 }).innerText();
  await page.locator('.record-sequence button').click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(beforeRandom);
  expect(nextLabel).toContain('Next record:');

  await page.getByRole('link', { name: /Return to archive/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Case files' })).toBeFocused();

  await goTo(page, '/scp/scp-ai-0000');
  await expect(page.getByRole('heading', { level: 1, name: 'Unknown designation' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Return to archive/i })).toBeVisible();
});

test('About and Licensing navigation focus their page headings', async ({ page }) => {
  await goTo(page, '/');
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeFocused();
  await page.getByRole('link', { name: /License & attribution/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Licensing & attribution' })).toBeFocused();
});

test('each top-level route keeps its hash when Skip to content is activated', async ({ page }) => {
  const { href } = await firstArticle(page);
  const articleHash = new URL(href, page.url()).hash;
  const routes = ['/', '/archive', '/about', '/licensing', articleHash.slice(1), '/missing-file'];

  for (const route of routes) {
    await goTo(page, route);
    const isArticle = route.startsWith('/scp/');
    if (isArticle) {
      await expect(page.locator('.article-body')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 900));
    }
    const hashBefore = await page.evaluate(() => window.location.hash);
    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(hashBefore);
    if (isArticle) {
      await expect.poll(() => page.locator('#main-content').evaluate((main) => Math.abs(main.getBoundingClientRect().top) < 2)).toBe(true);
    }
  }
});

test('Archive remains compact and free of horizontal overflow at responsive widths', async ({ page }) => {
  for (const width of [390, 430, 520, 820, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await goTo(page, '/archive');
    await expect(page.locator('.archive-filter-status')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await page.locator('.record-summary li button').first().click();
    await expect(page.locator('.archive-filter-status')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test('each archive row has one article link while retaining visible designation and arrow', async ({ page }) => {
  await goTo(page, '/archive');
  const row = page.locator('.record-row').first();
  await expect(row.locator('a')).toHaveCount(1);
  await expect(row.locator('.record-id strong')).toBeVisible();
  await expect(row.locator('.record-open')).toHaveAttribute('aria-hidden', 'true');
});
