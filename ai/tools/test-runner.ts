import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export async function runPlaywrightTest(): Promise<string> {
  // On utilise un chemin relatif simple pour Playwright
  const specRelativePath = "tests/features/tasks/scenarios/autonomous-created.spec.ts";
  const specPath = path.join(process.cwd(), specRelativePath);

  const code = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf-8') : 'Fichier manquant';

  try {
    // On entoure le chemin de guillemets pour Windows
    const { stdout } = await execAsync(`npx.cmd playwright test "${specRelativePath}" --project=chromium --reporter=list`);
    return `SUCCESS: ${stdout}`;
  } catch (error: any) {
    return `FAILURE:
CODE:
${code}
ERROR:
${error.stdout || error.stderr || error.message}`;
  }
}
