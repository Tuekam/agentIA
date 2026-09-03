import { mistralClient } from '../llm/mistral';
import { agentTools } from '../tools/definitions';
import { captureDom, closeBrowser, takeScreenshot, getSharedPage } from '../tools/browser-manager';
import { writeTestFiles } from '../tools/file-system';
import { runPlaywrightTest } from '../tools/test-runner';
import { listProjectFiles } from '../tools/file-explorer';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:3000';

export async function runAutonomousQA(intention: string) {
  let messages: any[] = [
    {
      role: 'system',
      content: `Tu es un expert QA Playwright.application : ${BASE_URL}.
RÈGLES D'OR :
1. ANALYSE D'ERREUR : Si 'run_playwright_test' échoue, regarde attentivement ton code et le DOM fourni dans l'erreur.
2. SÉLECTEURS STABLES : Utilise page.getByPlaceholder() ou page.getByText(). Pas de classes CSS.
3. LOGIQUE : Vérifie toujours via 'inspect_dom' que tes actions ont bien modifié la page avant d'écrire le test final.`,
    },
    {
      role: 'user',
      content: `Intention : "${intention}"`,
    },
  ];

  let isComplete = false;
  let maxSteps = 12;

  while (!isComplete && maxSteps > 0) {
    maxSteps--;
    console.log(`\n🧠 [Agent] Réflexion... (${maxSteps} restantes)`);

    try {
      const response = await mistralClient.chat.completions.create({
        model: 'mistral-small-latest',
        messages,
        tools: agentTools as any,
        tool_choice: 'auto'
      });

      const message = response.choices[0].message;
      messages.push(message);

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const name = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let result = '';

          console.log(`🛠️  Action : ${name}`);

          if (name === 'get_project_structure') {
            result = JSON.stringify(listProjectFiles());
          } else if (name === 'inspect_dom') {
            result = JSON.stringify(await captureDom(BASE_URL));
          } else if (name === 'take_screenshot') {
            const res = await takeScreenshot(BASE_URL, args.name);
            result = `Capture : ${res.screenshotPath}`;
          } else if (name === 'evaluate_dom_action') {
            const page = await getSharedPage(BASE_URL);
            for (const action of args.actions) {
              if (action.type === 'fill') await page.fill(action.selector, action.value);
              if (action.type === 'click') await page.click(action.selector);
              await page.waitForTimeout(500);
            }
            const postDom = await captureDom(BASE_URL);
            result = `Action effectuée. Voici le DOM mis à jour pour vérifier : ${postDom.htmlDom}`;
          } else if (name === 'write_test_files') {
            result = writeTestFiles(args.pageObjectCode, args.specCode);
          } else if (name === 'run_playwright_test') {
            result = await runPlaywrightTest();
            if (result.includes('✅')) {
               console.log("✅ TEST RÉUSSI");
               isComplete = true;
            } else {
               console.log("❌ ÉCHEC. Analyse de l'erreur par l'IA...");
            }
          }

          messages.push({ role: 'tool', name, content: result, tool_call_id: toolCall.id });
        }
      } else {
        console.log(`\n🏁 Fin.`);
        isComplete = true;
      }
    } catch (error: any) {
      if (error.status === 429) {
        console.log("⏳ Pause 10s (Rate limit)...");
        await sleep(10000);
      } else {
        console.error("Erreur :", error.message);
        isComplete = true;
      }
    }
  }
  await closeBrowser();
}
