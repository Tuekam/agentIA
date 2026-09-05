import { chromium, Browser, Page } from 'playwright';

export type DOMAction = {
  type: 'fill' | 'click' | 'press';
  selector: string;
  value?: string;
};

let sharedBrowser: Browser | null = null;
let sharedPage: Page | null = null;

export async function evaluateDomAction(url: string, actions: DOMAction[]) {
  try {
    if (!sharedBrowser) {
      sharedBrowser = await chromium.launch({ headless: true });
    }
    if (!sharedPage || sharedPage.isClosed()) {
      sharedPage = await sharedBrowser.newPage();
      await sharedPage.goto(url, { waitUntil: 'networkidle' });
    }

    for (const action of actions) {
      if (action.type === 'fill' && action.value) {
        await sharedPage.fill(action.selector, action.value);
      } else if (action.type === 'click') {
        await sharedPage.click(action.selector);
      } else if (action.type === 'press' && action.value) {
        await sharedPage.press(action.selector, action.value);
      }
      await sharedPage.waitForTimeout(500);
    }

    // Inspecte l'état post-action
    const postState = await sharedPage.evaluate(() => {
      const items = Array.from(
        document.querySelectorAll('li, tr, [role="listitem"], div[class*="item" i], div[class*="task" i]')
      );
      return items
        .map((el) => (el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim())
        .filter((t): t is string => !!t && t.length < 150);
    });

    return {
      success: true,
      visibleItemsAfterAction: Array.from(new Set(postState)),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function closeSharedBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedPage = null;
  }
}