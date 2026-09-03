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
      await page.waitForTimeout(500); // Temps de réponse JS local
    }

    // Capture des éléments texte créés pour fournir un Locator Playwright robuste à l'agent
    const locatorSuggestions = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('body *'));
      const meaningfulElements = elements.filter((el) => {
        const text = el.textContent?.trim();
        return (
          text &&
          el.children.length === 0 &&
          text.length > 0 &&
          text.length < 50
        );
      });

      return meaningfulElements.slice(-10).map((el) => ({
        text: el.textContent?.trim(),
        tagName: el.tagName.toLowerCase(),
        suggestedPlaywrightLocator: `page.getByText("${el.textContent?.trim()}", { exact: true })`,
      }));
    });

    await browser.close();

    return {
      success: true,
      elementsFoundAfterAction: locatorSuggestions,
    };
  } catch (error: any) {
    await browser.close();
    return {
      success: false,
      error: error.message,
    };
  }
}