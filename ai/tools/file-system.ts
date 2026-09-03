import * as fs from 'fs';
import * as path from 'path';

export function writeTestFiles(pageObjectCode: string, specCode: string): string {
  const pageObjectPath = path.join(process.cwd(), 'tests/features/tasks/autonomous-tasks.page.ts');
  const specPath = path.join(process.cwd(), 'tests/features/tasks/scenarios/autonomous-created.spec.ts');

  // Création automatique des répertoires parents s'ils n'existent pas
  fs.mkdirSync(path.dirname(pageObjectPath), { recursive: true });
  fs.mkdirSync(path.dirname(specPath), { recursive: true });

  // Nettoyage éventuel des balises Markdown si le LLM en a conservé
  const cleanPOM = pageObjectCode.replace(/```typescript|```ts|```/g, '').trim();
  const cleanSpec = specCode.replace(/```typescript|```ts|```/g, '').trim();

  fs.writeFileSync(pageObjectPath, cleanPOM, 'utf-8');
  fs.writeFileSync(specPath, cleanSpec, 'utf-8');

  return ` Fichiers écrits avec succès :\n- ${pageObjectPath}\n- ${specPath}`;
}