import 'dotenv/config';
import { run } from '@openai/agents';
import { config } from './config.js';
import { initMistralClient } from './llm/mistralClient.js';
import { explorerAgent } from './agents/explorerAgent.js';
import { testerAgent } from './agents/testerAgent.js';
import { closeBrowser } from './browser/session.js';
import { scenarioRegistry, resultsRegistry, bugsRegistry, resetRegistries } from './state/registry.js';
import { writeReport } from './report/writeReport.js';

function resolveTargetUrl(userGoal: string): string {
  const match = userGoal.match(/https?:\/\/[^\s)]+/i);
  return match?.[0].replace(/[.,!?]+$/, '') ?? config.targetUrl;
}

async function main() {
  const userGoal = process.argv[2] ?? `Explore le site ${config.targetUrl} et teste-le entièrement.`;
  const targetUrl = resolveTargetUrl(userGoal);

  resetRegistries();
  initMistralClient();

  console.log(`\n🔎 === Phase 1 : Exploration (${targetUrl}) ===\n`);
  await run(
    explorerAgent,
    `${userGoal}\n\nCommence par naviguer vers ${targetUrl}. Explore de façon hiérarchique : page racine, ` +
      `navigation globale, sections et éléments déclencheurs, contrôles, puis parcours fonctionnels et cas ` +
      `négatifs. Explore les fonctionnalités réellement présentes ` +
      `(formulaires, filtres, menus, listes, boutons...) et enregistre un scénario pertinent pour chaque ` +
      `fonctionnalité identifiée via record_scenario. N'invente aucun scénario pour atteindre un nombre minimal.`,
    { maxTurns: config.maxStepsExplorer },
  );

  if (scenarioRegistry.length === 0) {
    console.warn("\n⚠️  L'Explorateur n'a enregistré aucun scénario. Ajout du contrôle minimal d'accessibilité de la page.");
    scenarioRegistry.push({
      name: 'accessibilite_page_racine',
      goal: "Vérifier que l'URL cible est accessible et que la page racine peut être inspectée.",
      steps: [
        `Naviguer vers ${targetUrl}.`,
        "Inspecter la page et vérifier son titre, son URL et les éléments visibles.",
        "Classer le scénario comme blocked si la page ne peut pas être chargée ou inspectée.",
      ],
      level: 0,
    });
  }

  const orderedScenarios = scenarioRegistry
    .map((scenario, index) => ({ scenario, index }))
    .sort((a, b) => a.scenario.level - b.scenario.level || a.index - b.index)
    .map(({ scenario }) => scenario);

  scenarioRegistry.length = 0;
  scenarioRegistry.push(...orderedScenarios);

  console.log(`\n📋 ${scenarioRegistry.length} scénario(s) découvert(s), ordonnés hiérarchiquement :`);
  scenarioRegistry.forEach((s, i) => console.log(`  ${i + 1}. [N${s.level}] ${s.name} — ${s.goal}`));

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
    `Voici les scénarios à exécuter dans l'ordre hiérarchique sur ${targetUrl}. Commence par la page racine et ` +
      `les parents, puis les sections, contrôles, parcours nominaux et enfin les cas négatifs. Navigue vers cette URL au début, puis ` +
      `reviens à cette URL et inspecte l'état courant avant chaque nouveau scénario. Pour chacun : exécute les étapes, ` +
      `vérifie le résultat en respectant les règles critiques de tes instructions, puis appelle ` +
      `mark_scenario_result avant de passer au suivant.\n\n${scenarioListText}`,
    { maxTurns: scenarioRegistry.length * config.maxStepsPerScenario },
  );

  await closeBrowser();

  const reportPath = await writeReport({
    targetUrl,
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
