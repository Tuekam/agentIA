import { mistralClient } from '../llm/mistral';
import { agentTools } from '../tools/definitions';
import {
  captureState, closeBrowser, navigateTo, interactWithElement,
  takeScreenshot, selectOption, pressKey
} from '../tools/browser-manager';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runAutonomousQA(intention: string) {
  let messages: any[] = [
    {
      role: 'system',
      content: `Tu es un agent QA 100% autonome utilisant Playwright.
TON BUT : Realiser l'intention utilisateur en direct sur le site.

REGLES DE REFLEXION :
1. PENSEE : Avant CHAQUE action, tu dois expliquer ce que tu vois et pourquoi tu choisis cette action.
2. ANALYSE : Examine systematiquement l'etat renvoye apres une action pour valider ton succes.
3. AUTONOMIE : Decouvre le fonctionnement du site par toi-meme.

SECURITE : Tu ne dois JAMAIS appeler d'outil sans avoir produit un message de PENSEE juste avant.`,
    },
    { role: 'user', content: intention },
  ];

  let isComplete = false;
  let steps = 30;

  while (!isComplete && steps > 0) {
    steps--;
    try {
      const response = await mistralClient.chat.completions.create({
        model: 'open-mistral-7b',
        messages,
        tools: agentTools as any,
        tool_choice: 'auto'
      });

      const message = response.choices[0].message;

      if (message.content) {
        console.log(`\n[AGENT PENSEE]: ${message.content}`);
      }

      messages.push(message);

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const name = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let result = '';

          console.log(`[ACTION]: ${name}`);

          if (name === 'navigate_to') {
            result = JSON.stringify(await navigateTo(args.url));
          } else if (name === 'inspect_view') {
            result = JSON.stringify(await captureState());
          } else if (name === 'interact_with_element') {
            result = JSON.stringify(await interactWithElement(args.id, args.action, args.value));
          } else if (name === 'select_option') {
            result = JSON.stringify(await selectOption(args.id, args.value));
          } else if (name === 'press_key') {
            result = JSON.stringify(await pressKey(args.key));
          } else if (name === 'take_screenshot') {
            result = JSON.stringify(await takeScreenshot(args.name));
          } else if (name === 'finish_test') {
            console.log("\n--- INTENTION TERMINEE ---\n" + args.summary);
            isComplete = true;
            result = "Success";
          }

          messages.push({ role: 'tool', name, content: result, tool_call_id: toolCall.id });
        }
      } else if (!message.content) {
        isComplete = true;
      }
    } catch (error: any) {
      if (error.status === 429) {
        console.log("Attente quota (15s)...");
        await sleep(15000);
      } else {
        console.error("Erreur:", error.message);
        isComplete = true;
      }
    }
  }
  await sleep(2000);
  await closeBrowser();
}
