import { mistralClient } from '../llm/mistral';
import { agentTools } from '../tools/definitions';
import {
  captureState, closeBrowser, navigateTo, interactWithElement,
  takeScreenshot, selectOption, pressKey, clearInput
} from '../tools/browser-manager';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runAutonomousQA(intention: string) {
  let messages: any[] = [
    {
      role: 'system',
      content: `Tu es un agent QA 100% autonome (Browser Agent).
TON BUT : Realiser l'intention utilisateur en direct.

REGLES CRITIQUES SUR LES FILTRES :
1. MEMOIRE : L'application garde en memoire tes recherches et filtres.
2. VISIBILITE : Si tu as fait une recherche, les nouveaux elements qui ne correspondent pas seront CACHÉS.
3. BONNE PRATIQUE : Avant de verifier l'ajout d'une tache, utilise 'clear_input' sur le champ de recherche pour voir toute la liste.

REGLES DE REFLEXION :
1. PENSEE : Analyse l'etat renvoye (regarde les 'value' des inputs) avant d'agir.
2. ACTION : Une seule action a la fois.
3. FIN : Appelle 'finish_test' quand c'est fini.`,
    },
    { role: 'user', content: intention },
  ];

  let isComplete = false;
  let steps = 30;

  while (!isComplete && steps > 0) {
    steps--;
    try {
      const response = await mistralClient.chat.completions.create({
        model: 'ministral-8b-latest',
        messages,
        tools: agentTools as any,
        tool_choice: 'auto'
      });

      const message = response.choices[0].message;
      if (message.content) console.log(`\n[AGENT]: ${message.content}`);
      messages.push(message);

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const name = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let result = '';

          console.log(`[ACTION]: ${name}`);

          if (name === 'navigate_to') result = JSON.stringify(await navigateTo(args.url));
          else if (name === 'inspect_view') result = JSON.stringify(await captureState());
          else if (name === 'interact_with_element') result = JSON.stringify(await interactWithElement(args.id, args.action, args.value));
          else if (name === 'clear_input') result = JSON.stringify(await clearInput(args.id));
          else if (name === 'select_option') result = JSON.stringify(await selectOption(args.id, args.value));
          else if (name === 'press_key') result = JSON.stringify(await pressKey(args.key));
          else if (name === 'take_screenshot') result = JSON.stringify(await takeScreenshot(args.name));
          else if (name === 'finish_test') {
            console.log("\n--- TERMINE ---\n" + args.summary);
            isComplete = true;
            result = "Success";
          }

          messages.push({ role: 'tool', name, content: result, tool_call_id: toolCall.id });
        }
      } else { isComplete = true; }
    } catch (error: any) {
      if (error.status === 429) await sleep(15000);
      else { console.error("Erreur:", error.message); isComplete = true; }
    }
  }
  await sleep(2000); await closeBrowser();
}
