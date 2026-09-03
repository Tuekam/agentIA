import { mistralClient } from '../llm/mistral';
import { agentTools } from '../tools/definitions';
import { captureState, closeBrowser } from '../tools/browser-manager';
import { writeTestFiles } from '../tools/file-system';
import { runPlaywrightTest } from '../tools/test-runner';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = 'http://localhost:3000';

export async function runAutonomousQA(intention: string) {
  let messages: any[] = [
    {
      role: 'system',
      content: `Tu es un expert QA Playwright. Ecris un seul fichier de test complet (.spec.ts).
REGLES ABSOLUES :
1. URL : L'application est UNIQUEMENT sur ${BASE_URL}.
2. NOM UNIQUE : Utilise des noms de taches uniques.
3. EXECUTION : Tu DOIS appeler 'execute_test' après 'write_test'.`,
    },
    { role: 'user', content: intention },
  ];

  let isComplete = false;
  let steps = 10;

  while (!isComplete && steps > 0) {
    steps--;
    try {
      const response = await mistralClient.chat.completions.create({
        model: 'mistral-small-latest',
        messages,
        tools: agentTools as any,
      });

      const message = response.choices[0].message;
      messages.push(message);

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const name = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let result = '';

          if (name === 'inspect_page') {
            process.stdout.write("Inspection de la page... ");
            result = JSON.stringify(await captureState(BASE_URL));
            console.log("OK");
          } else if (name === 'write_test') {
            process.stdout.write("Ecriture du test... ");
            result = writeTestFiles(args.code);
            console.log("OK");
          } else if (name === 'execute_test') {
            process.stdout.write("Execution du test... ");
            result = await runPlaywrightTest();
            if (result.includes('SUCCESS')) {
              console.log("SUCCES");
              isComplete = true;
            } else {
              console.log("ECHEC");
              console.log("\n--- ERREUR DETECTION ---\n" + result + "\n----------------------\n");
            }
          }

          messages.push({ role: 'tool', name, content: result, tool_call_id: toolCall.id });
        }
      } else {
        isComplete = true;
      }
    } catch (error: any) {
      if (error.status === 429) {
        process.stdout.write("Attente rate limit... ");
        await sleep(15000);
        console.log("OK");
      } else {
        console.error("Erreur:", error.message);
        isComplete = true;
      }
    }
  }
  await closeBrowser();
}
