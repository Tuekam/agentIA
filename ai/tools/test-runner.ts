import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { captureDom } from './browser-manager';

const execAsync = promisify(exec);
const BASE_URL = 'http://localhost:3000';

export async function runPlaywrightTest(): Promise<string> {
  const pageObjectPath = path.join(process.cwd(), 'tests/features/tasks/autonomous-tasks.page.ts');
  const specPath = path.join(process.cwd(), 'tests/features/tasks/scenarios/autonomous-created.spec.ts');

  const currentPOM = fs.existsSync(pageObjectPath) ? fs.readFileSync(pageObjectPath, 'utf-8') : 'Non trouvé';
  const currentSpec = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf-8') : 'Non trouvé';

  try {
    const { stdout } = await execAsync(
      'npx playwright test tests/features/tasks/scenarios/autonomous-created.spec.ts --project=chromium --reporter=list'
    );
    return `✅ SUCCÈS DU TEST !\n${stdout}`;
  } catch (error: any) {
    const errorLog = error.stdout || error.stderr || error.message;

    // On capture le DOM actuel pour aider l'IA à comprendre l'échec
    const domAtFailure = await captureDom(BASE_URL);

    return `❌ ÉCHEC DU TEST PLAYWRIGHT.

--- VOTRE CODE POM ---
${currentPOM}

--- VOTRE CODE SPEC ---
${currentSpec}

--- ERREUR PLAYWRIGHT ---
${errorLog}

--- DOM AU MOMENT DE L'ÉCHEC ---
${domAtFailure.htmlDom}

CONSIGNE : Analyse pourquoi tes sélecteurs n'ont pas fonctionné avec le DOM ci-dessus et corrige write_test_files.`;
  }
}
