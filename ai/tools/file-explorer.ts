import * as fs from 'fs';
import * as path from 'path';

export function listProjectFiles(dirPath: string = 'tests'): string[] {
  const absolutePath = path.join(process.cwd(), dirPath);
  if (!fs.existsSync(absolutePath)) return [];

  const files: string[] = [];

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.includes('node_modules') && !entry.name.includes('.git')) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        // Enregistre le chemin relatif au projet
        files.push(path.relative(process.cwd(), fullPath).replace(/\\/g, '/'));
      }
    }
  }

  traverse(absolutePath);
  return files;
}