import { chromium } from 'playwright';

export type DOMAction = {
  type: 'fill' | 'click' | 'press';
  selector: string;
  value?: string;
};

export async function evaluateDomAction(url: string, actions: DOMAction[]) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    for (const action of actions) {
      if (action.type === 'fill' && action.value) {
        await page.fill(action.selector, action.value);
      } else if (action.type === 'click') {
        await page.click(action.selector);
      } else if (action.type === 'press' && action.value) {
        await page.press(action.selector, action.value);
      }
      await page.waitForTimeout(500);
    }

    // Inspection générique du DOM après action
    const domStructure = await page.evaluate(() => {
      // Repère les conteneurs de listes/cartes et leurs boutons internes
      const containerElements = Array.from(
        document.querySelectorAll('li, tr, [role="listitem"], div[class*="task" i], div[class*="item" i]')
      );

      const itemsDetail = containerElements.map((el) => {
        const buttons = Array.from(el.querySelectorAll('button, [role="button"], a')).map(
          (btn) => ({
            text: (btn as HTMLElement).innerText?.trim() || btn.getAttribute('aria-label') || 'unnamed button',
            tagName: btn.tagName.toLowerCase(),
          })
        );

        return {
          textContext: (el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim(),
          internalButtons: buttons,
        };
      });

      return itemsDetail;
    });

    await browser.close();

    return {
      success: true,
      detectedListContainers: domStructure,
    };
  } catch (error: any) {
    await browser.close();
    return {
      success: false,
      error: error.message,
    };
  }
}