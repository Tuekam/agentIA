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
  const messages: any[] = [
    {
      role: 'system',
      content: `Tu es un agent QA autonome. Ton objectif est de réaliser l'intention utilisateur en écrivant un test Playwright fonctionnel sur cette url : ${BASE_URL}.  

Tu as à ta disposition des outils d'exploration ('inspect_dom', 'evaluate_dom_action'), de création de fichiers ('write_test_files') et d'exécution ('run_playwright_test').

DÉMARCHE LIBRE ET AUTONOME :
1. Inspecte la page ou teste l'interaction avec 'evaluate_dom_action' si tu as un doute sur le fonctionnement de l'UI.
2. Écris le code du test.
3. Exécute le test.
4. Si le test échoue, utilise les outils à ta disposition pour comprendre l'échec et corriger le code par toi-même

RÈGLES POUR LES IMPORTS :
Avant d'écrire du code avec 'write_test_files', appelle TOUJOURS 'get_project_structure' pour connaître l'arborescence exacte des fichiers et construire des chemins d'importation relatifs exacts .
ORDRE STRICT D'EXÉCUTION :
1. 'get_project_structure' (pour connaître les chemins d'importation).
2. 'inspect_dom' (pour repérer le formulaire).
3. 'evaluate_dom_action' (OBLIGATOIRE : teste l'action et récupère le locator exact retourné par l'outil).
4. 'write_test_files' (écris le test en utilisant EXACTEMENT le locator fourni par evaluate_dom_action).
5. 'run_playwright_test'.`

},
    {
      role: 'user',
      content: `Intention de test : "${intention}"`
    }
  ];

  let isComplete = false;
  let maxSteps = 10;

  while (!isComplete && maxSteps > 0) {
    maxSteps--;
    console.log('\n🧠 [Agent] Réflexion...');
    await sleep(1500);

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
          args = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
        } catch (e) {
          args = {};
        }

        let result = '';
        console.log(`🛠️  [Agent Action] Appel de : "${functionName}"`);

        if (functionName === 'get_project_structure') {
          const files = listProjectFiles(args.directory || 'tests');
          result = JSON.stringify({ existingTestFiles: files });
          console.log(`   └─ Arborescence des fichiers récupérée (${files.length} fichiers trouvés).`);
        }
        else if (functionName === 'inspect_dom') {
          const snapshot = await inspectPage(BASE_URL);
          result = JSON.stringify(snapshot);
          console.log(`   └─ DOM inspecté sur ${BASE_URL}.`);
        } 
        else if (functionName === 'evaluate_dom_action') {
          const evaluation = await evaluateDomAction(BASE_URL, args.actions || []);
          result = JSON.stringify(evaluation);
          console.log(`   └─ Action exploratoire exécutée.`);
        }
        else if (functionName === 'write_test_files') {
          result = writeTestFiles(args.pageObjectCode, args.specCode);
          console.log(`   └─ Fichiers de test écrits.`);
        } 
        else if (functionName === 'run_playwright_test') {
          console.log(`   └─ Exécution du test Playwright...`);
          result = await runPlaywrightTest();
          console.log(`   └─ Résultat : ${result.includes('✅') ? 'SUCCÈS' : 'ÉCHEC'}`);
        }

        messages.push({
          role: 'tool',
          name: functionName,
          content: result,
          tool_call_id: toolCall.id,
        });
      }
    } else {
      console.log('\n🏁 [Agent Terminé] :', message.content);
      isComplete = true;
    }
  }
}