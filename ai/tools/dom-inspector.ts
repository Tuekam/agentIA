import { chromium, Page } from 'playwright';

export type InteractiveElement = {
  role?: string;
  tagName: string;
  text?: string;
  placeholder?: string;
  ariaLabel?: string;
  type?: string;
  id?: string;
  className?: string;
};

export type PageSnapshot = {
  url: string;
  title: string;
  interactiveElements: InteractiveElement[];
  structureSummary: string[];
};

export async function inspectPage(url: string): Promise<PageSnapshot> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  await page.goto(url, { waitUntil: 'networkidle' });

  const title = await page.title();

  // 1. Extraction des éléments interactifs
  const interactiveElements = await page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll('button, input, a, textarea, select, [role="button"]')
    );

    return elements.map((el) => {
      const htmlEl = el as HTMLElement;
      const inputEl = el as HTMLInputElement;

      return {
        tagName: el.tagName.toLowerCase(),
        role:
          el.getAttribute('role') ||
          (el.tagName === 'BUTTON'
            ? 'button'
            : el.tagName === 'A'
            ? 'link'
            : undefined),
        text: htmlEl.innerText?.trim() || undefined,
        placeholder: inputEl.placeholder || undefined,
        ariaLabel: el.getAttribute('aria-label') || undefined,
        type: inputEl.type || undefined,
        id: el.id || undefined,
        className: el.className || undefined,
      };
    });
  });

  // 2. Extraction des conteneurs et des structures de texte (sans dépendre des classes CSS instables)
  const structureSummary = await page.evaluate(() => {
    const listContainers = Array.from(
      document.querySelectorAll('ul, ol, table, tbody, [role="list"], div')
    ).filter((el) => el.children.length > 1 && el.clientHeight > 0);

    return listContainers.slice(0, 10).map((el) => {
      const htmlEl = el as HTMLElement;
      const sampleText = htmlEl.innerText
        ?.slice(0, 80)
        .replace(/\s+/g, ' ')
        .trim();
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || 'aucun';

      return `Tag: <${tag}> | Role: "${role}" | Contenu texte exemple: "${sampleText}"`;
    });
  });

  await browser.close();

  return {
    url,
    title,
    interactiveElements,
    structureSummary,
  };
}