import { chromium } from 'playwright';

export async function inspectPage(url: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    // Petite pause pour s'assurer de l'hydratation du composant React/Next.js
    await page.waitForTimeout(500);

    const cleanedHtml = await page.evaluate(() => {
      // 1. Cloner le body pour ne pas modifier la vraie page
      const clone = document.body.cloneNode(true) as HTMLElement;

      // 2. Supprimer les éléments non pertinents pour l'UI / IA (scripts, styles, svg, etc.)
      const elementsToRemove = clone.querySelectorAll('script, style, svg, noscript, iframe, link');
      elementsToRemove.forEach((el) => el.remove());

      // 3. Nettoyer les attributs inutiles pour alléger le prompt sans perdre la structure
      const allElements = clone.querySelectorAll('*');
      allElements.forEach((el) => {
        // Conserver uniquement les attributs utiles au ciblage
        const attributesToKeep = ['id', 'name', 'placeholder', 'type', 'role', 'aria-label', 'data-testid', 'value'];
        const attrs = Array.from(el.attributes);

        attrs.forEach((attr) => {
          if (!attributesToKeep.includes(attr.name)) {
            el.removeAttribute(attr.name);
          }
        });
      });

      // 4. Retourner le HTML nettoyé et compact
      return clone.innerHTML
        .replace(/<!--[\s\S]*?-->/g, '') // Supprimer les commentaires HTML
        .replace(/>\s+</g, '><')          // Supprimer les espaces entre balises
        .trim();
    });

    await browser.close();

    return {
      htmlDom: cleanedHtml,
    };
  } catch (error: any) {
    await browser.close();
    return { error: error.message };
  }
}