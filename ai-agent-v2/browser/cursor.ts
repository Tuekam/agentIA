import type { Page } from 'playwright';

const CURSOR_ID = '__ai_agent_cursor__';

const CURSOR_STYLE = `
  position: fixed; width: 14px; height: 14px; border-radius: 50%;
  background: #ff3b3b; border: 2px solid white; z-index: 2147483647;
  pointer-events: none; transition: left 0.25s ease-out, top 0.25s ease-out;
  box-shadow: 0 0 6px rgba(0,0,0,0.6);
`;

/**
 * Injecté via page.addInitScript : garantit que le curseur réapparaît
 * après CHAQUE navigation (contrairement à une simple injection ponctuelle
 * qui disparaîtrait au premier changement de page).
 */
export const CURSOR_INIT_SCRIPT = `(() => {
  function ensure() {
    if (document.getElementById('${CURSOR_ID}')) return;
    const el = document.createElement('div');
    el.id = '${CURSOR_ID}';
    el.style.cssText = \`${CURSOR_STYLE}\`;
    el.style.left = '-100px';
    el.style.top = '-100px';
    (document.body || document.documentElement).appendChild(el);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensure);
  } else {
    ensure();
  }
})();`;

export async function moveCursorTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ x, y, id, style }) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = style;
        (document.body || document.documentElement).appendChild(el);
      }
      el.style.left = `${x - 7}px`;
      el.style.top = `${y - 7}px`;
    },
    { x, y, id: CURSOR_ID, style: CURSOR_STYLE },
  );
  await page.waitForTimeout(250); // laisse le temps à l'oeil humain de suivre le mouvement
}
