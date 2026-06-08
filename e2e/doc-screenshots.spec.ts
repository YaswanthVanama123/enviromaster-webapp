import { test, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.resolve(process.cwd(), '../docs/images');

const ADMIN = { username: 'envimaster', password: 'Hanitha' };
const EMPLOYEE = { username: 'mark', password: 'Mark@123' };

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function go(page: Page, url: string, settle = 2500) {
  await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(settle);
}

async function loginAs(page: Page, role: 'admin' | 'employee', creds: { username: string; password: string }) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 15000 });
  await page.click(`button:has-text("${role === 'admin' ? 'Admin' : 'Employee'}")`);
  await page.fill('input[placeholder="Enter your username"]', creds.username);
  await page.fill('input[placeholder="Enter your password"]', creds.password);
  await page.click(`button:has-text("Sign in as ${role === 'admin' ? 'Admin' : 'Employee'}")`);
  await page.waitForURL(/(?!.*login).*/, { timeout: 20000 });
  await page.waitForTimeout(2000);
}

async function shoot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: true }).catch(() => {});
  console.log('captured', name);
}

test.use({ viewport: { width: 1440, height: 900 } });

test('capture login page', async ({ page }) => {
  ensureOutDir();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 15000 });
  await page.waitForTimeout(800);
  await shoot(page, '01-login.png');
});

test('capture employee pages', async ({ page }) => {
  test.setTimeout(180_000);
  ensureOutDir();
  await loginAs(page, 'employee', EMPLOYEE);

  await go(page, '/home');
  await shoot(page, '02-home.png');

  await go(page, '/form-filling', 3000);
  await shoot(page, '03-form-filling.png');

  // Form filling with a service showing live math + redline/greenline
  try {
    const rpmTab = page.locator('button:has-text("RPM Windows")').first();
    await rpmTab.click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    const numInputs = page.locator('input[type="number"]');
    const count = await numInputs.count();
    for (let i = 0; i < Math.min(3, count); i++) {
      await numInputs.nth(i).fill('12', { timeout: 3000 }).catch(() => {});
    }
    await page.waitForTimeout(1500);
    await shoot(page, '04-form-filling-live-math.png');
  } catch (e) {
    console.log('skip live-math shot:', (e as Error).message);
  }

  await go(page, '/my-commissions');
  await shoot(page, '05-my-commissions.png');

  await go(page, '/my-quota');
  await shoot(page, '06-my-quota.png');

  await go(page, '/saved-pdfs', 3000);
  await shoot(page, '07-saved-pdfs.png');
});

test('capture admin pages', async ({ page }) => {
  test.setTimeout(180_000);
  ensureOutDir();
  await loginAs(page, 'admin', ADMIN);

  await go(page, '/admin-panel', 3000);
  await shoot(page, '08-admin-dashboard.png');

  await go(page, '/admin-panel/pricing-details/payroll', 3000);
  await shoot(page, '09-payroll.png');

  await go(page, '/admin-panel/pricing-details', 3000);
  await shoot(page, '10-pricing-details.png');

  await go(page, '/admin-panel/approval-documents', 3000);
  await shoot(page, '11-approval-documents.png');

  await go(page, '/admin-panel/saved-pdfs', 3000);
  await shoot(page, '12-admin-saved-pdfs.png');

  await go(page, '/admin-commissions', 3000);
  await shoot(page, '13-employee-commissions.png');
});
