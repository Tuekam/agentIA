// ai/tools/test-runner.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export async function runPlaywrightTest(): Promise<string> {
  const pageObjectPath = path.join(process.cwd(), 'tests/features/tasks/autonomous-tasks.page.ts');
  const specPath = path.join(process.cwd(), 'tests/features/tasks/scenarios/autonomous-created.spec.ts');

  const currentPOM = fs.existsSync(pageObjectPath) ? fs.readFileSync(pageObjectPath, 'utf-8') : 'Non trouvé';
  const currentSpec = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf-8') : 'Non trouvé';

  try {
    // Exécution uniquement sur Chromium pour la phase d'agent autonome
    const { stdout } = await execAsync('npx playwright test tests/features/tasks/scenarios/autonomous-created.spec.ts --project=chromium --reporter=line');
    return ` SUCCÈS DU TEST !\nLe test est passé avec succès sur Chromium.`;
  } catch (error: any) {
    const errorLog = error.stdout || error.stderr || error.message;

    return ` ÉCHEC DU TEST.

--- CODE PAGE OBJECT ACTUEL ---
${currentPOM}

--- CODE SPEC ACTUEL ---
${currentSpec}

--- DÉTAILS DE L'ERREUR PLAYWRIGHT ---
${errorLog}

CONSIGNE : N'utilise pas de méthodes renvoyant un boolean. Utilise 'await expect(locator).toBeVisible()' directement dans le Spec. Corrige le code et rappelle 'write_test_files'.`;
  }
}