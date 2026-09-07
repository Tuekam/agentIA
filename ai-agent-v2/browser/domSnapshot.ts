import type { Page } from 'playwright';

export interface ElementInfo {
  id: number;
  tag: string;
  role: string;
  text: string;
  placeholder?: string;
  name?: string;
  type?: string;
  value?: string;
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  validationMessage?: string;
  formId?: string;
  options?: Array<{ label: string; value: string; selected: boolean; disabled: boolean }>;
  location: 'PAGE' | 'MODAL';
  /** true si cet élément peut révéler d'autres éléments (menu, select, details, aria-expanded) */
  isTrigger: boolean;
  x: number;
  y: number;
  /** Score de pertinence pour le tri (interne) */
  score?: number;
}

export interface FormInfo {
  id: string;
  action: string;
  method: string;
  valid: boolean;
  invalidFields: Array<{ name: string; type: string; validationMessage: string }>;
}

export interface Snapshot {
  url: string;
  title: string;
  modalOpen: boolean;
  /** Alertes générées automatiquement : filtres actifs, pagination possible, etc. */
  warnings: string[];
  elements: ElementInfo[];
  forms: FormInfo[];
  truncated: boolean;
}

/**
 * Code exécuté dans le contexte de la page (via page.evaluate).
 */
const IN_PAGE_CAPTURE_SRC = `(cursorId) => {
  const INTERACTIVE_SELECTOR =
    'button, a[href], input, select, textarea, [role="button"], [role="checkbox"], ' +
    '[role="menuitem"], [role="option"], [role="tab"], [role="switch"], [aria-haspopup], summary';

  const doc = document;
  doc.querySelectorAll('[data-ai-id]').forEach((el) => el.removeAttribute('data-ai-id'));

  const modal = doc.querySelector('[role="dialog"], .modal, [class*="modal" i], [aria-modal="true"]');
  const forms = Array.from(doc.querySelectorAll('form')).map((form, index) => {
    const formEl = form;
    const id = formEl.id || 'form-' + index;
    if (!formEl.id) formEl.setAttribute('data-ai-form-id', id);
    const controls = Array.from(formEl.elements).filter((element) =>
      element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement,
    );
    return {
      id,
      action: formEl.getAttribute('action') || '',
      method: (formEl.getAttribute('method') || 'get').toLowerCase(),
      valid: formEl.checkValidity(),
      invalidFields: controls.filter((element) => !element.validity.valid).map((element) => ({
        name: element.name,
        type: element.type,
        validationMessage: element.validationMessage,
      })),
    };
  });

  const nodes = Array.from(doc.querySelectorAll(INTERACTIVE_SELECTOR)).filter(
    (el) => el.id !== cursorId,
  );

  const scored = [];
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Cache pour le groupage des éléments répétitifs (ex: listes de tâches)
  const clusters = new Map();

  for (const el of nodes) {
    const htmlEl = el;
    const rect = htmlEl.getBoundingClientRect();
    const isInViewport = rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth;
    const isVisible = rect.width > 0 && rect.height > 0 && getComputedStyle(htmlEl).visibility !== 'hidden';
    if (!isVisible) continue;

    const tag = htmlEl.tagName.toLowerCase();
    const inputEl = htmlEl;
    const isCheckable = tag === 'input' && (inputEl.type === 'checkbox' || inputEl.type === 'radio');
    const isFormControl = tag === 'input' || tag === 'select' || tag === 'textarea';

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

    // Logique de groupage : on identifie les éléments similaires
    const parentClass = htmlEl.parentElement?.className || '';
    const clusterKey = tag + role + parentClass;
    const clusterCount = (clusters.get(clusterKey) || 0) + 1;
    clusters.set(clusterKey, clusterCount);

    // Règle d'échantillonnage : on ne garde que les 5 premiers de chaque groupe répétitif
    if (clusterCount > 5) continue;

    const info = {
      tag,
      role,
      text: (htmlEl.innerText || htmlEl.getAttribute('aria-label') || '').trim().slice(0, 40),
      placeholder: htmlEl.getAttribute('placeholder') ? htmlEl.getAttribute('placeholder').slice(0, 40) : undefined,
      name: isFormControl ? inputEl.name : undefined,
      type: isFormControl ? (inputEl.type || tag) : undefined,
      value: isCheckable ? undefined : (inputEl.value !== undefined ? inputEl.value : undefined),
      checked: isCheckable ? inputEl.checked : undefined,
      required: isFormControl ? inputEl.required : undefined,
      disabled: isFormControl ? inputEl.disabled : undefined,
      invalid: isFormControl ? !inputEl.validity.valid : undefined,
      validationMessage: isFormControl ? inputEl.validationMessage : undefined,
      formId: isFormControl && inputEl.form ? (inputEl.form.id || inputEl.form.getAttribute('data-ai-form-id') || '') : undefined,
      options: tag === 'select' ? Array.from(inputEl.options).map((option) => ({
        label: (option.textContent || '').trim(),
        value: option.value,
        selected: option.selected,
        disabled: option.disabled,
      })) : undefined,
      location: modal && modal.contains(el) ? 'MODAL' : 'PAGE',
      isTrigger,
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      // Calcul du score de priorité
      score: (isInViewport ? 100 : 0) + (['select', 'text-input', 'checkbox', 'radio'].indexOf(role) !== -1 ? 50 : role === 'button' ? 30 : 0)
    };
    scored.push({ el, info });
  }

  // Tri par score (les plus importants et visibles d'abord)
  scored.sort((a, b) => b.info.score - a.info.score);

  // Augmentation du plafond à 150 éléments
  const limited = scored.slice(0, 150);
  const truncated = scored.length > limited.length;

  const elements = limited.map((s, index) => {
    s.el.setAttribute('data-ai-id', index.toString());
    return Object.assign({ id: index }, s.info);
  });

  const warnings = [];
  // Détection des clusters tronqués pour avertir l'IA
  for (const [key, count] of clusters) {
    if (count > 5) {
      warnings.push('Plusieurs éléments similaires détectés (' + count + ') : seuls les 5 premiers sont affichés pour alléger la vue.');
    }
  }

  doc.querySelectorAll('input').forEach((el) => {
    const input = el;
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if ((input.type === 'text' || input.type === 'search' || !input.type) && input.value.trim() !== '') {
      const label = input.placeholder || input.getAttribute('aria-label') || input.name || 'un champ de saisie';
      warnings.push('Filtre actif : le champ "' + label + '" contient "' + input.value + '" — des éléments qui ne correspondent pas peuvent être invisibles.');
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
    forms: forms,
    truncated: truncated,
  };
}`;

// eslint-disable-next-line no-eval
const inPageCapture = (0, eval)(IN_PAGE_CAPTURE_SRC);

export async function captureSnapshot(page: Page): Promise<Snapshot> {
  await page.waitForTimeout(150);
  return page.evaluate(inPageCapture, '__ai_agent_cursor__');
}

export interface SnapshotDiff {
  newlyRevealed: string[];
  disappeared: string[];
  changed: string[];
}

function signature(e: ElementInfo): string {
  return `${e.tag}|${e.role}|${e.text}|${e.placeholder ?? ''}`;
}

function stateSignature(e: ElementInfo): string {
  return `${e.value ?? ''}|${e.checked ?? ''}|${e.required ?? ''}|${e.invalid ?? ''}|${e.validationMessage ?? ''}|${e.options?.map((option) => `${option.value}:${option.selected}`).join(',') ?? ''}`;
}

export function diffSnapshots(before: Snapshot, after: Snapshot): SnapshotDiff {
  const beforeSigs = new Set(before.elements.map(signature));
  const afterSigs = new Set(after.elements.map(signature));
  const beforeBySignature = new Map(before.elements.map((element) => [signature(element), element]));

  const newlyRevealed = after.elements
    .filter((e) => !beforeSigs.has(signature(e)))
    .map((e) => `[id=${e.id}] ${e.role} "${e.text || e.placeholder || ''}"`);

  const disappeared = before.elements
    .filter((e) => !afterSigs.has(signature(e)))
    .map((e) => `${e.role} "${e.text || e.placeholder || ''}"`);

  const changed = after.elements
    .filter((element) => {
      const previous = beforeBySignature.get(signature(element));
      return previous !== undefined && stateSignature(previous) !== stateSignature(element);
    })
    .map((element) => `[id=${element.id}] ${element.role} "${element.text || element.placeholder || ''}"`);

  return { newlyRevealed, disappeared, changed };
}
