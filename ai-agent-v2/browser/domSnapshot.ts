import type { Page } from 'playwright';

export interface ElementInfo {
  id: number;
  tag: string;
  role: string;
  text: string;
  placeholder?: string;
  value?: string;
  checked?: boolean;
  location: 'PAGE' | 'MODAL';
  /** true si cet élément peut révéler d'autres éléments (menu, select, details, aria-expanded) */
  isTrigger: boolean;
  x: number;
  y: number;
}

export interface Snapshot {
  url: string;
  title: string;
  modalOpen: boolean;
  /** Alertes générées automatiquement : filtres actifs, pagination possible, etc. */
  warnings: string[];
  elements: ElementInfo[];
  truncated: boolean;
}

/**
 * Code exécuté dans le contexte de la page (via page.evaluate).
 *
 * IMPORTANT : ceci est une CHAÎNE DE CARACTÈRES brute, volontairement non
 * écrite comme une fonction TypeScript normale. `tsx` compile ce fichier
 * avec l'option esbuild `keepNames: true`, qui injecte un helper
 * `__name(fn, "nom")` autour des fonctions/const. Ce helper vit dans le
 * scope du module Node compilé — s'il fonctionnait comme une fonction TS
 * normale, Playwright sérialiserait son `.toString()` pour l'exécuter tel
 * quel dans le navigateur, où `__name` n'existe pas => `ReferenceError`.
 * En gardant le code sous forme de chaîne, il n'est jamais passé par la
 * compilation esbuild et reste du JS pur, sûr à envoyer au navigateur.
 */
const IN_PAGE_CAPTURE_SRC = `(cursorId) => {
  const INTERACTIVE_SELECTOR =
    'button, a[href], input, select, textarea, [role="button"], [role="checkbox"], ' +
    '[role="menuitem"], [role="option"], [role="tab"], [role="switch"], [aria-haspopup], summary';

  const doc = document;
  doc.querySelectorAll('[data-ai-id]').forEach((el) => el.removeAttribute('data-ai-id'));

  const modal = doc.querySelector('[role="dialog"], .modal, [class*="modal" i], [aria-modal="true"]');
  const nodes = Array.from(doc.querySelectorAll(INTERACTIVE_SELECTOR)).filter(
    (el) => el.id !== cursorId,
  );

  const scored = [];

  for (const el of nodes) {
    const htmlEl = el;
    const rect = htmlEl.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && getComputedStyle(htmlEl).visibility !== 'hidden';
    if (!isVisible) continue;

    const tag = htmlEl.tagName.toLowerCase();
    const inputEl = htmlEl;
    const isCheckable = tag === 'input' && (inputEl.type === 'checkbox' || inputEl.type === 'radio');

    const isTrigger =
      tag === 'select' ||
      tag === 'summary' ||
      htmlEl.hasAttribute('aria-haspopup') ||
      htmlEl.hasAttribute('aria-expanded') ||
      /menu|dropdown|toggle|accordion/i.test(htmlEl.className || '');

    let role = tag;
    if (isCheckable) role = inputEl.type;
    else if (htmlEl.getAttribute('role')) role = htmlEl.getAttribute('role');
    else if (tag === 'a') role = 'link';
    else if (tag === 'input') role = 'text-input';

    const info = {
      tag,
      role,
      text: (htmlEl.innerText || htmlEl.getAttribute('aria-label') || '').trim().slice(0, 40),
      placeholder: htmlEl.getAttribute('placeholder') ? htmlEl.getAttribute('placeholder').slice(0, 40) : undefined,
      value: isCheckable ? undefined : (inputEl.value !== undefined ? inputEl.value : undefined),
      checked: isCheckable ? inputEl.checked : undefined,
      location: modal && modal.contains(el) ? 'MODAL' : 'PAGE',
      isTrigger,
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
    scored.push({ el, info });
  }

  const priority = (r) => (['select', 'text-input', 'checkbox', 'radio'].indexOf(r) !== -1 ? 0 : r === 'button' ? 1 : 2);
  scored.sort((a, b) => priority(a.info.role) - priority(b.info.role));

  const limited = scored.slice(0, 60);
  const truncated = scored.length > limited.length;

  const elements = limited.map((s, index) => {
    s.el.setAttribute('data-ai-id', index.toString());
    return Object.assign({ id: index }, s.info);
  });

  const warnings = [];
  doc.querySelectorAll('input').forEach((el) => {
    const input = el;
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if ((input.type === 'text' || input.type === 'search' || !input.type) && input.value.trim() !== '') {
      const label = input.placeholder || input.getAttribute('aria-label') || input.name || 'un champ de saisie';
      warnings.push('Filtre actif : le champ "' + label + '" contient "' + input.value + '" — des éléments qui ne correspondent pas peuvent être invisibles.');
    }
  });
  doc.querySelectorAll('select').forEach((el) => {
    const select = el;
    const rect = select.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (select.options.length > 0 && select.selectedIndex > 0) {
      let label = select.getAttribute('aria-label') || select.name;
      if (!label && select.id) {
        const forLabel = doc.querySelector('label[for="' + select.id + '"]');
        if (forLabel) label = forLabel.textContent.trim();
      }
      if (!label) {
        const parentLabel = select.closest('label');
        if (parentLabel) label = (parentLabel.textContent || '').trim();
      }
      if (!label) {
        const idAttr = select.id ? '#' + select.id : '';
        label = 'une liste déroulante' + (idAttr ? ' (' + idAttr + ')' : '');
      }
      warnings.push('Filtre/option actif : "' + label + '" est réglé sur "' + select.options[select.selectedIndex].text + '" (pas la valeur par défaut) — cela peut limiter ce qui est affiché ou trié différemment.');
    }
  });

  const bodyText = doc.body.innerText || '';
  const counterMatch = bodyText.match(/(\\d+)\\s*(?:sur|of|\\/)\\s*(\\d+)/i);
  if (counterMatch && counterMatch[1] !== counterMatch[2]) {
    warnings.push('Un compteur/pagination semble indiquer "' + counterMatch[0] + '" — il pourrait y avoir des éléments non affichés sur la page courante.');
  }

  if (truncated) {
    warnings.push('Trop d\\'éléments interactifs sur la page (' + scored.length + ') : seuls les ' + limited.length + ' plus pertinents sont listés.');
  }

  return {
    url: location.href,
    title: doc.title,
    modalOpen: !!modal,
    warnings: warnings,
    elements: elements,
    truncated: truncated,
  };
}`;

// Reconstruit une vraie fonction à l'exécution (jamais vue par esbuild/tsx,
// donc sans le helper __name) à partir de la chaîne ci-dessus.
// eslint-disable-next-line no-eval
const inPageCapture = (0, eval)(IN_PAGE_CAPTURE_SRC);

export async function captureSnapshot(page: Page): Promise<Snapshot> {
  await page.waitForTimeout(150); // laisse les éventuelles animations/rendus se stabiliser
  return page.evaluate(inPageCapture, '__ai_agent_cursor__');
}

export interface SnapshotDiff {
  newlyRevealed: string[];
  disappeared: string[];
}

function signature(e: ElementInfo): string {
  return `${e.tag}|${e.role}|${e.text}|${e.placeholder ?? ''}`;
}

export function diffSnapshots(before: Snapshot, after: Snapshot): SnapshotDiff {
  const beforeSigs = new Set(before.elements.map(signature));
  const afterSigs = new Set(after.elements.map(signature));

  const newlyRevealed = after.elements
    .filter((e) => !beforeSigs.has(signature(e)))
    .map((e) => `[id=${e.id}] ${e.role} "${e.text || e.placeholder || ''}"`);

  const disappeared = before.elements
    .filter((e) => !afterSigs.has(signature(e)))
    .map((e) => `${e.role} "${e.text || e.placeholder || ''}"`);

  return { newlyRevealed, disappeared };
}
