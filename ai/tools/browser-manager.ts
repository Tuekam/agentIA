import { chromium, Browser, Page } from '@playwright/test';

let browser: Browser | null = null;
let page: Page | null = null;

export async function getPage(url: string): Promise<Page> {
  if (!browser) browser = await chromium.launch({ headless: true });
  if (!page || page.isClosed()) {
    page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
  }
  return page;
}

export async function captureState(url: string) {
  const p = await getPage(url);
  await p.waitForTimeout(1000);

  const elements = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('button, input, select, span, h1, h2'))
      .map(el => {
        const htmlEl = el as HTMLElement;
        return {
          tag: htmlEl.tagName.toLowerCase(),
          text: htmlEl.innerText?.trim() || htmlEl.getAttribute('value') || '',
          placeholder: htmlEl.getAttribute('placeholder') || '',
          role: htmlEl.getAttribute('role') || '',
          isVisible: htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0
        };
      })
      .filter(e => e.isVisible && (e.text || e.placeholder || e.tag === 'input'));
  });

  return { elements };
}

export async function closeBrowser() {
  if (browser) await browser.close();
  browser = null;
  page = null;
}
