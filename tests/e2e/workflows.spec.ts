import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { test, expect } from './fixtures.js';

async function addEmployee(page: Page, name = 'Alex Example') {
  await page.getByLabel('Employee name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await expect(page.getByText(`${name.trim()} was added to your team.`, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start timer', exact: true })).toBeEnabled();
}

test('employee creation, timer reload/restart, and completed history', async ({ page, app }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(app.url);
  await expect(page.getByText('A great workday starts with your team.')).toBeVisible();
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await expect(page.getByText('Enter an employee name.', { exact: true })).toBeVisible();
  await addEmployee(page, '  Alex Example  ');
  await expect(page.getByText('No completed time entries in this period.')).toBeVisible();
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  await expect(page.getByText('Describe the task before starting a timer.')).toBeVisible();
  await page.getByLabel('Task description').fill('Draft the fictional project brief');
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop timer', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Elapsed time')).not.toHaveText('00:00:00');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Stop timer', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Task description')).toHaveValue('Draft the fictional project brief');
  await page.getByRole('button', { name: 'Stop timer', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Draft the fictional project brief', exact: true })).toBeVisible();
  await page.getByLabel('Task description').fill('Review the fictional brief');
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop timer', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Stop timer', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('employee/date filters, empty report, accessible desktop/mobile layout', async ({ page, app }, testInfo) => {
  await page.goto(app.url);
  await addEmployee(page);
  // Seed only this disposable database with a deterministic completed task.
  const start = await page.getByLabel('From', { exact: true }).inputValue();
  const timestamp = await page.evaluate(day => new Date(`${day}T09:00:00`).getTime(), start);
  const db = new DatabaseSync(app.databasePath);
  const employee = db.prepare('SELECT id FROM employees').get();
  db.prepare('INSERT INTO time_entries VALUES (?, ?, ?, ?, ?)')
    .run('example-entry', String(employee!.id), 'Design a fictional team dashboard', timestamp, timestamp + 5400000);
  db.close();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('.report-total')).toContainText('01:30:00');
  await page.getByLabel('From', { exact: true }).fill('2000-01-01');
  await page.getByLabel('Through', { exact: true }).fill('2000-01-01');
  await page.getByRole('button', { name: 'View report', exact: true }).click();
  await expect(page.getByText('No completed time entries in this period.')).toBeVisible();
  await expect(page.locator('.report-total')).toContainText('00:00:00');
  await page.getByLabel('From', { exact: true }).fill('2000-01-02');
  await page.getByRole('button', { name: 'View report', exact: true }).click();
  await expect(page.getByText('Choose valid dates with the start on or before the end.')).toBeVisible();
  await page.getByLabel('From', { exact: true }).fill(start);
  await page.getByLabel('Through', { exact: true }).fill(start);
  await page.getByRole('button', { name: 'View report', exact: true }).click();
  await expect(page.locator('.report-total')).toContainText('01:30:00');
  await addEmployee(page, 'Sam Sample');
  await page.getByRole('button', { name: 'Track time for Sam Sample, employee 2', exact: true }).click();
  await expect(page.getByText('No completed time entries in this period.')).toBeVisible();
  await page.getByRole('button', { name: 'Track time for Alex Example, employee 1', exact: true }).click();
  await expect(page.locator('.report-total')).toContainText('01:30:00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('workspace.png'), fullPage: true });
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations.map(issue => ({ id: issue.id, targets: issue.nodes.map(node => node.target) }))).toEqual([]);
  await page.getByRole('region', { name: 'Completed time entries', exact: true }).focus();
  await expect(page.getByRole('region', { name: 'Completed time entries', exact: true })).toBeFocused();
});

test('failed employee requests preserve drafts and recover without false success', async ({ page, app }) => {
  await page.route('**/api/employees', route => route.abort());
  await page.goto(app.url);
  await expect(page.getByText('We couldn’t load your team. Check your connection and try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add employee', exact: true })).toBeDisabled();
  await page.unroute('**/api/employees');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add employee', exact: true })).toBeEnabled();
  await page.route('**/api/employees', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await page.getByLabel('Employee name', { exact: true }).fill('Casey Sample');
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await expect(page.getByText(/Could not confirm the save/)).toBeVisible();
  await expect(page.getByLabel('Employee name', { exact: true })).toHaveValue('Casey Sample');
  await page.unroute('**/api/employees');
  await page.getByRole('button', { name: 'Refresh employee list', exact: true }).click();
  await addEmployee(page, 'Casey Sample');
  await expect(page.getByRole('list', { name: 'Employees' }).getByRole('listitem')).toHaveCount(1);
});

test('a lost start response recovers the existing timer instead of duplicating it', async ({ page, app }) => {
  await page.goto(app.url);
  await addEmployee(page);
  await page.getByLabel('Task description').fill('Recover this fictional task');
  await page.route('**/timer/start', async route => {
    await route.fetch(); // The server writes successfully, but the client loses its response.
    await route.abort();
  });
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  await expect(page.getByText(/Refresh to confirm the timer state/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start timer', exact: true })).toBeDisabled();
  await page.unroute('**/timer/start');
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop timer', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Stop timer', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
});
