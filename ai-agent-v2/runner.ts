import 'dotenv/config';
import { run } from '@openai/agents';
import { config } from './config.js';
import { initMistralClient } from './llm/mistralClient.js';
import { explorerAgent } from './agents/explorerAgent.js';
import { testerAgent } from './agents/testerAgent.js';
import { closeBrowser } from './browser/session.js';
import { scenarioRegistry, resultsRegistry, bugsRegistry, resetRegistries } from './state/registry.js';
import { writeReport } from './report/writeReport.js';

async function main() {
  const userGoal = process.argv[2] ?? `Explore le site ${config.targetUrl} et teste-le entièrement.`;

  resetRegistries();
  initMistralClient();

  console.log(`\n🔎 === Phase 1 : Exploration (${config.targetUrl}) ===\n`);
  await run(
    explorerAgent,
    `${userGoal}\n\nCommence par naviguer vers ${config.targetUrl}, explore ses fonctionnalités ` +
      `(formulaires, filtres, menus, listes, boutons...), puis enregistre au moins 5 scénarios de test ` +
      `pertinents via record_scenario avant de conclure.`,
    { maxTurns: config.maxStepsExplorer },
  );

  if (scenarioRegistry.length === 0) {
    console.error("\n⚠️  Aucun scénario n'a été généré par l'agent Explorateur. Arrêt.");
    await closeBrowser();
    process.exit(1);
  }

  console.log(`\n📋 ${scenarioRegistry.length} scénario(s) découvert(s) :`);
  scenarioRegistry.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} — ${s.goal}`));

  const scenarioListText = scenarioRegistry
    .map(
      (s, i) =>
        `Scénario ${i + 1} — ${s.name}\nObjectif : ${s.goal}\nÉtapes suggérées :\n${s.steps
          .map((step) => `  - ${step}`)
          .join('\n')}`,
    )
    .join('\n\n');

  console.log(`\n🧪 === Phase 2 : Exécution des tests ===\n`);
  await run(
    testerAgent,
    `Voici les scénarios à exécuter un par un sur ${config.targetUrl}. Pour chacun : exécute les étapes, ` +
      `vérifie le résultat en respectant les règles critiques de tes instructions, puis appelle ` +
      `mark_scenario_result avant de passer au suivant.\n\n${scenarioListText}`,
    { maxTurns: scenarioRegistry.length * config.maxStepsPerScenario },
  );

  await closeBrowser();

  const reportPath = await writeReport({
    targetUrl: config.targetUrl,
    scenarios: scenarioRegistry,
    results: resultsRegistry,
    bugs: bugsRegistry,
  });

  console.log(`\n✅ === Rapport final généré : ${reportPath} ===\n`);
}

main().catch(async (error) => {
  console.error('\n❌ Erreur fatale :', error);
  await closeBrowser();
  process.exit(1);
});
