import { chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

let browser: Browser | null = null;
let page: Page | null = null;

export async function getPage(url?: string): Promise<Page> {
  if (!browser) {
    browser = await chromium.launch({
      headless: false,
      slowMo: 500
    });
  }
  if (!page || page.isClosed()) {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    // Injection de la souris visuelle
    await page.addInitScript(() => {
      const box = document.createElement('div');
      box.id = 'ai-mouse-pointer';
      box.style.position = 'fixed';
      box.style.top = '0'; box.style.left = '0';
      box.style.width = '15px'; box.style.height = '15px';
      box.style.background = 'red'; box.style.borderRadius = '50%';
      box.style.zIndex = '99999'; box.style.pointerEvents = 'none';
      box.style.border = '2px solid white';
      box.style.display = 'none';
      document.documentElement.appendChild(box);
    });

    if (url) await page.goto(url, { waitUntil: 'networkidle' });
  }
  return page;
}

async function moveVisualMouse(p: Page, x: number, y: number) {
  await p.evaluate(({ x, y }) => {
    const pointer = document.getElementById('ai-mouse-pointer');
    if (pointer) {
      pointer.style.display = 'block';
      pointer.style.top = `${y - 7}px`;
      pointer.style.left = `${x - 7}px`;
    }
  }, { x, y });
  await p.waitForTimeout(400);
}

export async function captureState() {
  const p = await getPage();
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(800);

  const state = await p.evaluate(() => {
    // 1. Nettoyage et Marquage physique des elements
    document.querySelectorAll('[data-ai-id]').forEach(el => el.removeAttribute('data-ai-id'));

    const modal = document.querySelector('div[role="dialog"], .modal, [class*="modal" i]');
    const all = Array.from(document.querySelectorAll('button, input, select, span, h1, h2, a, p, [role="button"]'));

    const elements = all.map((el, index) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      const isInModal = modal?.contains(el) || false;

      if (isVisible) {
        htmlEl.setAttribute('data-ai-id', index.toString());
      }

      return {
        id: index,
        tag: htmlEl.tagName.toLowerCase(),
        text: htmlEl.innerText?.trim().slice(0, 30) || htmlEl.getAttribute('value')?.slice(0, 30) || '',
        pld: htmlEl.getAttribute('placeholder')?.slice(0, 20) || '',
        loc: isInModal ? 'MOD' : 'PG',
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        isVisible
      };
    }).filter(e => e.isVisible && (e.tag === 'input' || e.tag === 'button' || e.tag === 'select' || e.text || e.pld));

    return { elements, modalVisible: !!modal, url: window.location.href };
  });

  return state;
}

export async function interactWithElement(id: number, action: 'click' | 'fill' | 'press', value?: string) {
  const p = await getPage();
  const selector = `[data-ai-id="${id}"]`;
  const locator = p.locator(selector);

  // 1. Verification visuelle
  const box = await locator.boundingBox();
  if (box) {
    await moveVisualMouse(p, box.x + box.width / 2, box.y + box.height / 2);
  }

  // 2. Action via API Playwright Native (Tres robuste)
  await locator.scrollIntoViewIfNeeded();

  if (action === 'fill' && value !== undefined) {
    await locator.fill(value);
  } else if (action === 'click') {
    await locator.click();
  } else if (action === 'press' && value) {
    await locator.press(value);
  }

  return await captureState();
}

export async function mouseClick(x: number, y: number) {
  const p = await getPage();
  await moveVisualMouse(p, x, y);
  await p.mouse.click(x, y);
  return await captureState();
}

export async function navigateTo(url: string) {
  const p = await getPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  return await captureState();
}

export async function takeScreenshot(name: string) {
  const p = await getPage();
  const resultsDir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);
  const screenshotPath = path.join(resultsDir, `${name}-${Date.now()}.png`);
  await p.screenshot({ path: screenshotPath, fullPage: true });
  return { status: "Capture enregistree", path: screenshotPath };
}

export async function closeBrowser() {
  if (browser) await browser.close();
  browser = null;
  page = null;
}
