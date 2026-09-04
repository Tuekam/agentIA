import { chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

let browser: Browser | null = null;
let page: Page | null = null;

export async function getPage(url?: string): Promise<Page> {
  if (!browser) {
    browser = await chromium.launch({
      headless: false,
      slowMo: 800
    });
  }
  if (!page || page.isClosed()) {
    page = await browser.newPage();
    if (url) await page.goto(url, { waitUntil: 'networkidle' });
  }
  return page;
}

export async function captureState() {
  const p = await getPage();
  await p.waitForTimeout(800); // Un peu plus de temps pour les modales

  const state = await p.evaluate(() => {
    // On cherche d'abord si une modale est ouverte
    const modal = document.querySelector('div[role="dialog"], .modal, [class*="modal" i], [class*="dialog" i]');
    const isModalOpen = !!modal;

    const elements = Array.from(document.querySelectorAll('button, input, select, span, h1, h2, a, p'))
      .map(el => {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        const isInModal = modal?.contains(el) || false;

        return {
          tag: htmlEl.tagName.toLowerCase(),
          text: htmlEl.innerText?.trim() || htmlEl.getAttribute('value') || '',
          placeholder: htmlEl.getAttribute('placeholder') || '',
          role: htmlEl.getAttribute('role') || '',
          isVisible: rect.width > 0 && rect.height > 0,
          isFocused: document.activeElement === el,
          location: isInModal ? 'MODALE' : 'PAGE'
        };
      })
      .filter(e => e.isVisible && (e.text || e.placeholder || e.tag === 'input'));

    return {
      isModalOpen,
      elements
    };
  });

  return {
    url: p.url(),
    modalVisible: state.isModalOpen,
    elements: state.elements
  };
}

export async function navigateTo(url: string) {
  const p = await getPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  return await captureState();
}

export async function clickElement(selector: string) {
  const p = await getPage();
  await p.click(selector);
  return await captureState();
}

export async function clickText(text: string) {
  const p = await getPage();

  // 1. On cherche d'abord si une modale est visible pour eviter l'ambiguité des boutons
  const modal = p.locator('div[role="dialog"], .modal, [class*="modal" i], [class*="dialog" i]').filter({ visible: true }).first();
  const isModalVisible = await modal.isVisible().catch(() => false);

  let target;
  if (isModalVisible) {
    // 2. Priorité absolue aux boutons de la modale si elle est ouverte
    target = modal.locator(`button:has-text("${text}"), a:has-text("${text}"), [role="button"]:has-text("${text}")`).first();
    console.log(`[DEBUG]: Tentative de clic sur "${text}" dans la MODALE`);
  } else {
    // 3. Comportement normal sur toute la page
    target = p.locator(`button:has-text("${text}"), a:has-text("${text}"), [role="button"]:has-text("${text}")`).first();
  }

  try {
    await target.click({ timeout: 3000 });
  } catch (e) {
    // Si le clic prioritaire echoue, on tente un clic global en dernier recours
    await p.locator(`text="${text}"`).first().click({ timeout: 2000 });
  }

  return await captureState();
}

export async function waitForText(text: string) {
  const p = await getPage();
  await p.locator(`text=${text}`).first().waitFor({ state: 'visible' });
  return await captureState();
}

export async function fillField(selector: string, value: string) {
  const p = await getPage();
  await p.fill(selector, value);
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
