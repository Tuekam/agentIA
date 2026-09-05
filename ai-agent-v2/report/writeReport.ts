import fs from 'node:fs/promises';
import path from 'node:path';
import type { Scenario, ScenarioResult, Bug } from '../state/registry.js';

export async function writeReport(data: {
  targetUrl: string;
  scenarios: Scenario[];
  results: ScenarioResult[];
  bugs: Bug[];
}): Promise<string> {
  const { targetUrl, scenarios, results, bugs } = data;
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const blocked = results.filter((r) => r.status === 'blocked').length;

  const lines: string[] = [];
  lines.push(`# Rapport de test autonome — ${targetUrl}`);
  lines.push(`\nGénéré le ${new Date().toLocaleString('fr-FR')}`);
  lines.push(`\n## Résumé`);
  lines.push(`- Scénarios découverts : ${scenarios.length}`);
  lines.push(`- ✅ Réussis : ${passed}`);
  lines.push(`- ❌ Échoués : ${failed}`);
  lines.push(`- 🚧 Bloqués : ${blocked}`);
  lines.push(`- 🐛 Anomalies signalées : ${bugs.length}`);

  lines.push(`\n## Détail des scénarios`);
  for (const scenario of scenarios) {
    const result = results.find((r) => r.name === scenario.name);
    const icon = result?.status === 'pass' ? '✅' : result?.status === 'fail' ? '❌' : result?.status === 'blocked' ? '🚧' : '❓';
    lines.push(`\n### ${icon} ${scenario.name}`);
    lines.push(`**Objectif** : ${scenario.goal}`);
    lines.push(`\n**Étapes prévues** :`);
    scenario.steps.forEach((s) => lines.push(`- ${s}`));
    if (result) {
      lines.push(`\n**Résultat** : ${result.status}`);
      lines.push(`**Notes** : ${result.notes}`);
    } else {
      lines.push(`\n**Résultat** : non exécuté`);
    }
  }

  if (bugs.length > 0) {
    lines.push(`\n## Anomalies détectées`);
    for (const bug of bugs) {
      lines.push(`\n### [${bug.severity.toUpperCase()}] ${bug.title}`);
      lines.push(bug.description);
      if (bug.screenshotPath) lines.push(`\nCapture : \`${bug.screenshotPath}\``);
    }
  }

  const dir = path.resolve('reports');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `rapport_${Date.now()}.md`);
  await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}
