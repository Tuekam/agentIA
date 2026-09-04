import { chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

let browser: Browser | null = null;
let page: Page | null = null;

export async function getPage(url?: string): Promise<Page> {
  if (!browser) {
    browser = await chromium.launch({ headless: false, slowMo: 600 });
  }
  if (!page || page.isClosed()) {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    if (url) await page.goto(url, { waitUntil: 'load' });
  }
  return page;
}

// Re-injection forcee du curseur pour qu'il ne disparaisse jamais
async function moveVisualMouse(p: Page, x: number, y: number) {
  await p.evaluate(({ x, y }) => {
    let ptr = document.getElementById('ai-mouse-pointer');
    if (!ptr) {
      ptr = document.createElement('div');
      ptr.id = 'ai-mouse-pointer';
      ptr.style.position = 'fixed'; ptr.style.width = '12px'; ptr.style.height = '12px';
      ptr.style.background = 'red'; ptr.style.borderRadius = '50%';
      ptr.style.zIndex = '999999'; ptr.style.pointerEvents = 'none';
      ptr.style.border = '2px solid white'; ptr.style.transition = 'all 0.3s ease-out';
      document.body.appendChild(ptr);
    }
    ptr.style.display = 'block';
    ptr.style.top = `${y - 6}px`;
    ptr.style.left = `${x - 6}px`;
  }, { x, y });
  await p.waitForTimeout(400);
}

export async function captureState() {
  const p = await getPage();
  await p.waitForTimeout(1000);

  const state = await p.evaluate(() => {
    document.querySelectorAll('[data-ai-id]').forEach(el => el.removeAttribute('data-ai-id'));
    const modal = document.querySelector('div[role="dialog"], .modal, [class*="modal" i]');
    const all = Array.from(document.querySelectorAll('button, input, select, span, h1, h2, a, p, [role="button"]'));

    // Resume des filtres pour l'IA
    const activeFilters = {
      recherche: (document.querySelector('input[placeholder*="Rechercher" i]') as any)?.value || 'aucune',
      statut: (document.querySelector('select:nth-of-type(1)') as any)?.value || 'tous',
      limite: (document.querySelector('select:nth-of-type(3)') as any)?.value || 'par défaut'
    };

    const elements = all.map((el, index) => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      if (isVisible) htmlEl.setAttribute('data-ai-id', index.toString());

      return {
        id: index,
        tag: htmlEl.tagName.toLowerCase(),
        text: htmlEl.innerText?.trim().slice(0, 30) || '',
        val: (htmlEl as any).value || '',
        pld: htmlEl.getAttribute('placeholder')?.slice(0, 20) || '',
        loc: modal?.contains(el) ? 'MODALE' : 'PAGE',
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        isVisible
      };
    }).filter(e => e.isVisible && (e.tag === 'input' || e.tag === 'button' || e.tag === 'select' || e.text || e.pld));

    return { activeFilters, elements, modalVisible: !!modal };
  });

  return state;
}

export async function interactWithElement(id: number, action: 'click' | 'fill' | 'press', value?: string) {
  try {
    const p = await getPage();
    const loc = p.locator(`[data-ai-id="${id}"]`);
    const box = await loc.boundingBox();
    if (box) await moveVisualMouse(p, box.x + box.width / 2, box.y + box.height / 2);

    await loc.scrollIntoViewIfNeeded();
    if (action === 'fill' && value !== undefined) await loc.fill(value);
    else if (action === 'click') await loc.click({ force: true });
    else if (action === 'press' && value) await loc.press(value);

    return await captureState();
  } catch (e: any) { return { error: e.message }; }
}

export async function clearInput(id: number) {
  try {
    const p = await getPage();
    const loc = p.locator(`[data-ai-id="${id}"]`);
    const box = await loc.boundingBox();
    if (box) await moveVisualMouse(p, box.x + box.width / 2, box.y + box.height / 2);
    await loc.clear();
    return await captureState();
  } catch (e: any) { return { error: e.message }; }
}

export async function selectOption(id: number, value: string) {
  try {
    const p = await getPage();
    const loc = p.locator(`[data-ai-id="${id}"]`);
    const box = await loc.boundingBox();
    if (box) await moveVisualMouse(p, box.x + box.width / 2, box.y + box.height / 2);
    await loc.selectOption(value);
    return await captureState();
  } catch (e: any) { return { error: e.message }; }
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

export async function closeBrowser() { if (browser) await browser.close(); browser = null; page = null; }
