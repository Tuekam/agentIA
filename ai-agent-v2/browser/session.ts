import { chromium, type Browser, type Page } from 'playwright';
import { config } from '../config.js';
import { CURSOR_INIT_SCRIPT } from './cursor.js';

let browser: Browser | null = null;
let page: Page | null = null;

export async function getPage(): Promise<Page> {
  if (!browser) {
    browser = await chromium.launch({ headless: false, slowMo: config.slowMoMs });
  }
  if (!page || page.isClosed()) {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.addInitScript(CURSOR_INIT_SCRIPT);
  }
  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browser) await browser.close();
  browser = null;
  page = null;
}
