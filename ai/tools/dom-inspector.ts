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

export type PaginationAndSearchInfo = {
  hasSearchInput: boolean;
  searchPlaceholder?: string;
  hasPaginationControls: boolean;
  paginationText?: string;
};

export type PageSnapshot = {
  url: string;
  title: string;
  interactiveElements: InteractiveElement[];
  pageContext: PaginationAndSearchInfo;
  visibleItemsSummary: string[];
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

  // 2. Recherche de fonctionnalités clés : Barre de recherche et Pagination
  const pageContext = await page.evaluate(() => {
    const searchInput = document.querySelector(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="recherch" i], input[placeholder*="filtr" i]'
    ) as HTMLInputElement | null;

    const paginationEl = document.querySelector(
      '[class*="pagination" i], [aria-label*="pagination" i], div:has(button[aria-label*="next" i]), nav'
    ) as HTMLElement | null;

    return {
      hasSearchInput: !!searchInput,
      searchPlaceholder: searchInput?.placeholder || undefined,
      hasPaginationControls: !!paginationEl,
      paginationText: paginationEl?.innerText?.replace(/\s+/g, ' ').trim() || undefined,
    };
  });

  // 3. Capture des textes et éléments de liste actuellement visibles
  const visibleItemsSummary = await page.evaluate(() => {
    const items = Array.from(
      document.querySelectorAll('li, tr, [role="listitem"], div[class*="task" i], div[class*="item" i]')
    );

    const visibleTextList = items
      .map((el) => (el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim())
      .filter((text): text is string => !!text && text.length > 0 && text.length < 150);

    // Supprime les doublons éventuels
    return Array.from(new Set(visibleTextList)).slice(0, 15);
  });

  await browser.close();

  return {
    url,
    title,
    interactiveElements,
    pageContext,
    visibleItemsSummary,
  };
}