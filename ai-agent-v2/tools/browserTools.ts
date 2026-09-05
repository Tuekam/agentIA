import { tool } from '@openai/agents';
import { z } from 'zod';
import { getPage } from '../browser/session.js';
import { moveCursorTo } from '../browser/cursor.js';
import { captureSnapshot, diffSnapshots } from '../browser/domSnapshot.js';
import fs from 'node:fs/promises';
import path from 'node:path';

async function locatorOrError(id: number) {
  const page = await getPage();
  const loc = page.locator(`[data-ai-id="${id}"]`);
  const count = await loc.count();
  if (count === 0) {
    return {
      error: `Aucun élément avec l'id ${id}. Les IDs changent après chaque action (DOM re-rendu) : refais 'inspect_view' pour obtenir les IDs à jour avant de réessayer.`,
    };
  }
  return { page, loc };
}

async function focusVisually(page: Awaited<ReturnType<typeof getPage>>, loc: any) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const box = await loc.boundingBox();
  if (box) await moveCursorTo(page, box.x + box.width / 2, box.y + box.height / 2);
}

export const navigateTool = tool({
  name: 'navigate',
  description: 'Navigue vers une URL absolue (http/https) dans le navigateur.',
  parameters: z.object({ url: z.string().describe('URL absolue à charger') }),
  execute: async ({ url }) => {
    const page = await getPage();
    await page.goto(url, { waitUntil: 'load' });
    return await captureSnapshot(page);
  },
});

export const inspectTool = tool({
  name: 'inspect_view',
  description:
    "Retourne l'état actuel de la page : liste des éléments interactifs avec leur ID (data-ai-id), " +
    "des alertes ('warnings') sur les filtres/pagination actuellement actifs, et un indicateur 'isTrigger' " +
    'pour les éléments susceptibles de révéler du contenu caché (menus, listes déroulantes, accordéons). ' +
    "Les IDs changent après CHAQUE action : appelle toujours inspect_view (ou regarde le retour de l'action) " +
    "avant d'agir sur un nouvel ID.",
  parameters: z.object({}),
  execute: async () => {
    const page = await getPage();
    return await captureSnapshot(page);
  },
});

export const clickTool = tool({
  name: 'click',
  description:
    "Clique sur l'élément désigné par son ID. Retourne le nouvel état de la page ainsi qu'un champ 'diff' " +
    "listant les éléments qui viennent d'apparaître ('newlyRevealed') ou de disparaître ('disappeared') " +
    "suite à ce clic — utile pour les menus et listes déroulantes qui révèlent leur contenu au clic.",
  parameters: z.object({ id: z.number().describe("ID data-ai-id de l'élément, obtenu via inspect_view") }),
  execute: async ({ id }) => {
    const resolved = await locatorOrError(id);
    if ('error' in resolved) return resolved;
    const { page, loc } = resolved;
    const before = await captureSnapshot(page);
    await focusVisually(page, loc);
    try {
      await loc.click({ timeout: 5000 });
    } catch (e: any) {
      return { error: `Le clic a échoué : ${e.message}` };
    }
    const after = await captureSnapshot(page);
    return { ...after, diff: diffSnapshots(before, after) };
  },
});

export const fillTool = tool({
  name: 'fill',
  description: "Remplit un champ texte désigné par son ID. Écrase intégralement le contenu existant.",
  parameters: z.object({ id: z.number(), text: z.string() }),
  execute: async ({ id, text }) => {
    const resolved = await locatorOrError(id);
    if ('error' in resolved) return resolved;
    const { page, loc } = resolved;
    await focusVisually(page, loc);
    try {
      await loc.fill(text, { timeout: 5000 });
    } catch (e: any) {
      return { error: `Le remplissage a échoué : ${e.message}` };
    }
    return await captureSnapshot(page);
  },
});

export const selectOptionTool = tool({
  name: 'select_option',
  description: "Choisit une option dans une liste déroulante (<select>) désignée par son ID, par son texte visible.",
  parameters: z.object({ id: z.number(), optionLabel: z.string().describe("Texte visible de l'option à choisir") }),
  execute: async ({ id, optionLabel }) => {
    const resolved = await locatorOrError(id);
    if ('error' in resolved) return resolved;
    const { page, loc } = resolved;
    await focusVisually(page, loc);
    try {
      await loc.selectOption({ label: optionLabel }, { timeout: 5000 });
    } catch (e: any) {
      return { error: `Sélection échouée : ${e.message}. Vérifie le texte exact de l'option via inspect_view.` };
    }
    return await captureSnapshot(page);
  },
});

export const pressKeyTool = tool({
  name: 'press_key',
  description: "Envoie une touche clavier (ex: 'Enter', 'Escape', 'Tab') au focus courant.",
  parameters: z.object({ key: z.string() }),
  execute: async ({ key }) => {
    const page = await getPage();
    await page.keyboard.press(key);
    return await captureSnapshot(page);
  },
});

export const resetFiltersTool = tool({
  name: 'reset_filters',
  description:
    "Réinitialise EN UN SEUL APPEL tous les filtres visibles de la page courante : les champs de recherche " +
    "sont vidés, les listes déroulantes sont remises à leur première option. À utiliser systématiquement " +
    "avant de conclure qu'un élément est absent, car un filtre actif peut le cacher sans que ce soit un bug.",
  parameters: z.object({}),
  execute: async () => {
    const page = await getPage();
    await page.evaluate(() => {
      document.querySelectorAll('input').forEach((el) => {
        const input = el as HTMLInputElement;
        if ((input.type === 'text' || input.type === 'search' || !input.type) && input.value) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          setter?.call(input, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      document.querySelectorAll('select').forEach((el) => {
        const select = el as HTMLSelectElement;
        if (select.options.length > 0 && select.selectedIndex !== 0) {
          select.selectedIndex = 0;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
    return await captureSnapshot(page);
  },
});

export const screenshotTool = tool({
  name: 'take_screenshot',
  description: 'Prend une capture visuelle de la page courante et la sauvegarde comme preuve (utile avec report_bug).',
  parameters: z.object({ name: z.string().describe('Nom court sans espaces, ex: "erreur_ajout_tache"') }),
  execute: async ({ name }) => {
    const page = await getPage();
    const dir = path.resolve('reports', 'screenshots');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${Date.now()}_${name}.png`);
    await page.screenshot({ path: filePath });
    return { savedTo: filePath };
  },
});
