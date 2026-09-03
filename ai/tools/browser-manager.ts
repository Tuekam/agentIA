import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

let sharedBrowser: Browser | null = null;
let sharedPage: Page | null = null;

export async function getSharedPage(url: string): Promise<Page> {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({ headless: true });
  }
  if (!sharedPage || sharedPage.isClosed()) {
    sharedPage = await sharedBrowser.newPage();
    await sharedPage.goto(url, { waitUntil: 'networkidle' });
  }
  return sharedPage;
}

export async function captureDom(url: string) {
  const page = await getSharedPage(url);

  // Attente plus longue pour Firestore
  await page.waitForTimeout(1500);

  const cleanedHtml = await page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    const elementsToRemove = clone.querySelectorAll('script, style, svg, noscript, iframe, link');
    elementsToRemove.forEach((el) => el.remove());

    const allElements = clone.querySelectorAll('*');
    allElements.forEach((el) => {
      // On garde uniquement les attributs sémantiques et stables
      const attributesToKeep = ['id', 'name', 'placeholder', 'type', 'role', 'aria-label', 'data-testid', 'value'];
      const attrs = Array.from(el.attributes);

      attrs.forEach((attr) => {
        if (!attributesToKeep.includes(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return clone.innerHTML
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .trim();
  });

  return { htmlDom: cleanedHtml };
}

export async function takeScreenshot(url: string, name: string) {
  const page = await getSharedPage(url);
  const screenshotPath = path.join(process.cwd(), 'results', `${name}-${Date.now()}.png`);

  if (!fs.existsSync(path.join(process.cwd(), 'results'))) {
    fs.mkdirSync(path.join(process.cwd(), 'results'));
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  return { screenshotPath };
}

export async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedPage = null;
  }
}
