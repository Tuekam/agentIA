import * as fs from 'fs';
import * as path from 'path';

export function writeTestFiles(code: string): string {
  const specPath = path.join(process.cwd(), 'tests/features/tasks/scenarios/autonomous-created.spec.ts');
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  const clean = code.replace(/```typescript|```ts|```/g, '').trim();
  fs.writeFileSync(specPath, clean, 'utf-8');
  return `OK: ${specPath}`;
}
