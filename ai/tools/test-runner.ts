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
    const { stdout } = await execAsync('npx playwright test tests/features/tasks/scenarios/autonomous-created.spec.ts --project=chromium --reporter=list');
    return `✅ SUCCÈS DU TEST !\nLe test s'est exécuté sans erreur.`;
  } catch (error: any) {
    const errorLog = error.stdout || error.stderr || error.message;

    return `❌ ÉCHEC DU TEST PLAYWRIGHT.

--- CODE PAGE OBJECT ACTUEL ---
${currentPOM}

--- CODE SPEC ACTUEL ---
${currentSpec}

--- ERREUR BRUTE PLAYWRIGHT ---
${errorLog}

Analyse l'erreur Playwright ci-dessus, modifie le code via 'write_test_files' pour corriger le problème, puis relance le test.`;
  }
}