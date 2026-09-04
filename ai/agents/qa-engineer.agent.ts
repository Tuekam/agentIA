import { mistralClient } from '../llm/mistral';
import { agentTools } from '../tools/definitions';
import {
  captureState, closeBrowser, navigateTo, clickElement,
  fillField, clickText, waitForText, takeScreenshot
} from '../tools/browser-manager';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runAutonomousQA(intention: string) {
  let messages: any[] = [
    {
      role: 'system',
      content: `Tu es un agent de navigation autonome utilisant Playwright et tu va tester l'application de toi meme sans attendre la reponse l'utilisateur.
TON BUT : Realiser l'intention utilisateur en direct sur le site.

REGLES DE REFLEXION :
1. PENSEE : Avant CHAQUE action, tu dois expliquer ce que tu vois et pourquoi tu choisis cette action.
2. ANALYSE : Regarde attentivement l'etat renvoye. n'oublie pas qu'il y'a les elements marqués.
4. PRUDENCE : Ne repete pas la meme action inutilement.

SÉLECTEURS : Privilegie 'click_text' pour les boutons avec du texte .`,
    },
    { role: 'user', content: intention },
  ];

  let isComplete = false;
  let steps = 20;

  while (!isComplete && steps > 0) {
    steps--;
    try {
      // On force le modele a produire du texte avant les outils si possible
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
            const state = await navigateTo(args.url);
            result = JSON.stringify(state);
          } else if (name === 'inspect_view') {
            result = JSON.stringify(await captureState());
          } else if (name === 'click_button') {
            const state = await clickElement(args.selector);
            result = JSON.stringify(state);
          } else if (name === 'click_text') {
            const state = await clickText(args.text);
            result = JSON.stringify(state);
          } else if (name === 'wait_for_text') {
            const state = await waitForText(args.text);
            result = JSON.stringify(state);
          } else if (name === 'fill_input') {
            const state = await fillField(args.selector, args.value);
            result = JSON.stringify(state);
          } else if (name === 'take_screenshot') {
            const res = await takeScreenshot(args.name);
            result = JSON.stringify(res);
          } else if (name === 'finish_test') {
            console.log("\n--- RESULTAT FINAL ---");
            console.log(args.summary);
            isComplete = true;
          }

          messages.push({ role: 'tool', name, content: result, tool_call_id: toolCall.id });
        }
      } else if (!message.content) {
        // Si pas de texte et pas d'outil, on s'arrete pour eviter la boucle infinie
        isComplete = true;
      }
    } catch (error: any) {
      if (error.status === 429) {
        console.log("Attente (Rate Limit)...");
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
