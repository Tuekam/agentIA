import { mistralClient } from '../llm/mistral';
import { agentTools } from '../tools/definitions';
import { inspectPage } from '../tools/dom-inspector';
import { writeTestFiles } from '../tools/file-system';
import { runPlaywrightTest } from '../tools/test-runner';
import { evaluateDomAction } from '../tools/action-evaluator';
import { listProjectFiles } from '../tools/file-explorer';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:3000';

export async function runAutonomousQA(intention: string) {
  let messages: any[] = [
    {
      role: 'system',
      content: `Tu es un agent QA autonome Playwright TypeScript.

DIRECTIVES D'AUTONOMIE GÉNÉRIQUES :
1. Tu as accès à l'outil 'get_project_structure' pour explorer l'arborescence des fichiers de test existants.
2. Analyse le DOM via 'inspect_dom' ou 'evaluate_dom_action' pour découvrir les sélecteurs réels. Ne devine JAMAIS de sélecteurs non observés.
3. Si une action implique de cibler un élément spécifique dans un composant de liste, utilise la stratégie Playwright .filter({ hasText: '...' }). VOICI le lien de l'application : ${BASE_URL}
4. Cycle de travail :
   a. Explore le projet et l'application ('get_project_structure', 'inspect_dom', 'evaluate_dom_action').
   b. Rédige le code POM et Spec ('write_test_files').
   c. Valide en exécutant ('run_playwright_test').
5. En cas d'échec de 'run_playwright_test', analyse l'erreur retournée, ajuste le code avec 'write_test_files' et re-teste.`
    },
    {
      role: 'user',
      content: `Intention de test : "${intention}"`,
    },
  ];

  let isComplete = false;
  let maxSteps = 100;
  let testFailuresCount = 0;

  while (!isComplete && maxSteps > 0) {
    maxSteps--;
    console.log(`\n [Agent Mistral] Réflexion... (Étapes restantes : ${maxSteps})`);

    await sleep(2000);

    // Troncature sécurisée pour éviter 'Unexpected role tool'
    if (messages.length > 14) {
      const systemMsg = messages[0];
      const userPrompt = messages[1];
      let recentMessages = messages.slice(-10);

      while (recentMessages.length > 0 && recentMessages[0].role === 'tool') {
        recentMessages.shift();
      }

      messages = [systemMsg, userPrompt, ...recentMessages];
    }

    try {
      const response = await mistralClient.chat.completions.create({
        model: 'mistral-small-latest',
        messages,
        tools: agentTools as any,
        tool_choice: 'auto',
      });

      const message = response.choices[0].message;
      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const functionName = toolCall.function.name;
          let args: any = {};
          try {
            args =
              typeof toolCall.function.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments;
          } catch (e) {
            args = {};
          }

          let result = '';
          console.log(`  [Agent Action] Appel de : "${functionName}"`);

          if (functionName === 'get_project_structure') {
            const files = listProjectFiles(args.directory || 'tests');
            result = JSON.stringify({ existingTestFiles: files });
            console.log(`   └─ Arborescence lue (${files.length} fichiers).`);
          } else if (functionName === 'inspect_dom') {
            const snapshot = await inspectPage(BASE_URL);
            result = JSON.stringify(snapshot);
            console.log(
              `   └─ DOM inspecté. Items visibles: ${snapshot.visibleItemsSummary.length}`
            );
          } else if (functionName === 'evaluate_dom_action') {
            const evaluation = await evaluateDomAction(
              BASE_URL,
              args.actions || []
            );
            result = JSON.stringify(evaluation);
            console.log(`   └─ Action exploratoire exécutée sur le navigateur.`);
          } else if (functionName === 'write_test_files') {
            result = writeTestFiles(args.pageObjectCode, args.specCode);
            console.log(`   └─ Fichiers de test (POM + Spec) écrits avec succès.`);
          } else if (functionName === 'run_playwright_test') {
            console.log(`   └─ Exécution de Playwright sur Chromium...`);
            result = await runPlaywrightTest();
            const isSuccess = result.includes('✅');
            console.log(`   └─ Résultat : ${isSuccess ? 'SUCCÈS' : 'ÉCHEC'}`);

            if (!isSuccess) {
              testFailuresCount++;
              if (testFailuresCount >= 100) {
                console.log(
                  '\n [Arrêt de sécurité] Le test a échoué 100 fois. Arrêt pour analyse.'
                );
                isComplete = true;
              }
            } else {
              isComplete = true;
            }
          }

          messages.push({
            role: 'tool',
            name: functionName,
            content: result,
            tool_call_id: toolCall.id,
          });
        }
      } else {
        console.log('\n [Agent Terminé] :', message.content);
        isComplete = true;
      }
    } catch (error: any) {
      if (error.status === 429) {
        console.log('\n [Rate Limit 429] Attente de 10 secondes...');
        await sleep(10000);
      } else {
        console.error('Erreur lors de l\'exécution de l\'agent :', error);
        isComplete = true;
      }
    }
  }

  if (maxSteps === 0 && !isComplete) {
    console.log('\n⚠️ [Arrêt] L\'agent a atteint le nombre maximum d\'étapes autorisées.');
  }
}