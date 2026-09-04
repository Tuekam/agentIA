import { chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

let browser: Browser | null = null;
let page: Page | null = null;

export async function getPage(url?: string): Promise<Page> {
  if (!browser) {
    browser = await chromium.launch({ headless: false, slowMo: 500 });
  }
  if (!page || page.isClosed()) {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    if (url) await page.goto(url, { waitUntil: 'load' });
  }
  return page;
}

async function ensureVisualMouse(p: Page) {
  await p.evaluate(() => {
    let pointer = document.getElementById('ai-mouse-pointer');
    if (!pointer) {
      pointer = document.createElement('div');
      pointer.id = 'ai-mouse-pointer';
      pointer.style.position = 'fixed';
      pointer.style.width = '15px';
      pointer.style.height = '15px';
      pointer.style.background = 'red';
      pointer.style.borderRadius = '50%';
      pointer.style.zIndex = '999999';
      pointer.style.pointerEvents = 'none';
      pointer.style.border = '2px solid white';
      pointer.style.transition = 'all 0.3s ease-out';
      document.body.appendChild(pointer);
    }
    pointer.style.display = 'block';
  });
}

async function moveVisualMouse(p: Page, x: number, y: number) {
  await ensureVisualMouse(p);
  await p.evaluate(({ x, y }) => {
    const pointer = document.getElementById('ai-mouse-pointer');
    if (pointer) {
      pointer.style.top = `${y - 7}px`;
      pointer.style.left = `${x - 7}px`;
    }
  }, { x, y });
  await p.waitForTimeout(400);
}

export async function captureState() {
  const p = await getPage();

  // Attente cruciale : on attend qu'un element de l'app apparaisse (timeout 10s)
  await p.waitForSelector('h1, input, button', { state: 'visible', timeout: 10000 }).catch(() => {
    console.log("[DEBUG]: Aucun element structurant trouvé après 10s.");
  });

  await p.waitForTimeout(1000);

  const state = await p.evaluate(() => {
    document.querySelectorAll('[data-ai-id]').forEach(el => el.removeAttribute('data-ai-id'));
    const modal = document.querySelector('div[role="dialog"], .modal, [class*="modal" i]');

    const all = Array.from(document.querySelectorAll('button, input, select, span, h1, h2, a, p, [role="button"]'));
    const elements = all.map((el, index) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      if (isVisible) htmlEl.setAttribute('data-ai-id', index.toString());

      return {
        id: index,
        tag: htmlEl.tagName.toLowerCase(),
        text: htmlEl.innerText?.trim().slice(0, 30) || htmlEl.getAttribute('value')?.slice(0, 30) || '',
        pld: htmlEl.getAttribute('placeholder')?.slice(0, 20) || '',
        loc: modal?.contains(el) ? 'MODALE' : 'PAGE',
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
  try {
    const p = await getPage();
    const locator = p.locator(`[data-ai-id="${id}"]`);

    const box = await locator.boundingBox();
    if (box) await moveVisualMouse(p, box.x + box.width / 2, box.y + box.height / 2);

    await locator.scrollIntoViewIfNeeded();
    if (action === 'fill' && value !== undefined) await locator.fill(value);
    else if (action === 'click') await locator.click({ force: true });
    else if (action === 'press' && value) await locator.press(value);

    return await captureState();
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function selectOption(id: number, value: string) {
  try {
    const p = await getPage();
    const locator = p.locator(`[data-ai-id="${id}"]`);
    const box = await locator.boundingBox();
    if (box) await moveVisualMouse(p, box.x + box.width / 2, box.y + box.height / 2);

    await locator.selectOption(value);
    return await captureState();
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function pressKey(key: string) {
  const p = await getPage();
  await p.keyboard.press(key);
  return await captureState();
}

export async function navigateTo(url: string) {
  const p = await getPage();
  await p.goto(url, { waitUntil: 'load' });
  return await captureState();
}

export async function takeScreenshot(name: string) {
  const p = await getPage();
  if (!fs.existsSync('results')) fs.mkdirSync('results');
  const screenshotPath = `results/${name}-${Date.now()}.png`;
  await p.screenshot({ path: screenshotPath, fullPage: true });
  return { status: "OK", path: screenshotPath };
}

export async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (e) {}
  }
  browser = null; page = null;
}
