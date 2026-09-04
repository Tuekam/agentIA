import { mistralClient } from '../llm/mistral';
import { agentTools } from '../tools/definitions';
import {
  captureState, closeBrowser, navigateTo, interactWithElement, takeScreenshot, mouseClick
} from '../tools/browser-manager';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runAutonomousQA(intention: string) {
  let messages: any[] = [
    {
      role: 'system',
      content: `Tu es un agent de navigation autonome (Browser Agent)
TON BUT : Realiser l'intention utilisateur en direct sur le site sans lui poser des question.

REGLES :
1. ANALYSE : Utilise 'inspect_view' pour voir les IDs et coordonnees x,y.
2. ACTION : Une seule action a la fois. Utilise 'interact_with_element' (clic technique) ou 'mouse_click' (clic souris reel).
3. VERIFICATION : Apres une action (ex: ajouter), tu DOIS appeler 'inspect_view' pour verifier le resultat avant de continuer.
4. FIN : Tu DOIS obligatoirement appeler 'finish_test' avec un resume quand tu as terminé.`,
    },
    { role: 'user', content: intention },
  ];

  let isComplete = false;
  let steps = 25;

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
      if (message.content) console.log(`\n[AGENT]: ${message.content}`);
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
          } else if (name === 'mouse_click') {
            result = JSON.stringify(await mouseClick(args.x, args.y));
          } else if (name === 'take_screenshot') {
            result = JSON.stringify(await takeScreenshot(args.name));
          } else if (name === 'finish_test') {
            console.log("\n--- INTENTION TERMINEE ---\n" + args.summary);
            isComplete = true;
            result = "Success";
          }

          messages.push({ role: 'tool', name, content: result, tool_call_id: toolCall.id });
        }
      } else {
        // Fin de la boucle si l'IA envoie du texte sans outil
        isComplete = true;
      }
    } catch (error: any) {
      if (error.status === 429) {
        await sleep(10000);
      } else {
        console.error("Erreur:", error.message);
        isComplete = true;
      }
    }
  }
  await sleep(2000);
  await closeBrowser();
}
